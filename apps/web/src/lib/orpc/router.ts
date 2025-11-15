import { z } from "zod";
import { encryptedDataSchema } from "../encryption/types";
import { sha256 } from "../utils/hash";
import {
  settingsRecordEncryptedSchema,
  settingsResponseSchema,
  userAgentResponseSchema,
} from "@/modules/settings/sync/types";
import { baseOs } from "./base-router";
import { settingsStoreClient } from "../redis/settings-client";
import { UAParser } from "ua-parser-js";

const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

type StoredProfile = z.infer<typeof settingsRecordEncryptedSchema>;

async function computeAuthHash(token: string): Promise<string> {
  return sha256(token);
}

function transformUserAgent(
  userAgent: z.infer<typeof settingsRecordEncryptedSchema>["userAgent"],
): z.infer<typeof userAgentResponseSchema> | null {
  if (!userAgent) {
    return null;
  }
  const { os, browser } = UAParser(userAgent);
  return userAgentResponseSchema.decode({
    browser: browser.name,
    os: os.name,
  });
}

const fetchProfiles = baseOs
  .errors({
    NOT_FOUND: {
      message: "Profile not found",
    },
  })
  .input(z.object({ token: z.string().nonempty() }))
  .output(settingsResponseSchema)
  .handler(async ({ input, errors }) => {
    const authToken = input.token;
    const authHash = await computeAuthHash(authToken);
    const stored = await settingsStoreClient.get(authHash);
    if (!stored) {
      throw errors.NOT_FOUND();
    }
    return {
      ...stored,
      userAgent: transformUserAgent(stored.userAgent),
    };
  });

const fetchMetadata = baseOs
  .errors({
    NOT_FOUND: {
      message: "Metadata not found",
    },
  })
  .input(z.object({ token: z.string().nonempty() }))
  .output(settingsResponseSchema.omit({ data: true }))
  .handler(async ({ input, errors }) => {
    const authHash = await computeAuthHash(input.token);
    const stored = await settingsStoreClient.get(authHash);
    if (!stored) {
      throw errors.NOT_FOUND();
    }
    return settingsResponseSchema.omit({ data: true }).decode({
      ...stored,
      userAgent: transformUserAgent(stored.userAgent),
    });
  });

const uploadProfiles = baseOs
  .errors({
    PAYLOAD_TOO_LARGE: {
      message: "Payload too large, max 1MB",
    },
    CONFLICT: {
      message: "Version conflict",
      data: settingsResponseSchema,
    },
  })
  .input(
    z.object({
      data: encryptedDataSchema,
      version: z.number().int().nonnegative(),
      token: z.string().nonempty(),
    }),
  )
  .handler(async ({ input, errors, context }) => {
    const { token, data, version } = input;
    if (JSON.stringify(data).length > MAX_PAYLOAD_SIZE) {
      throw errors.PAYLOAD_TOO_LARGE();
    }
    const authHash = await computeAuthHash(token);

    const existingProfile = await settingsStoreClient.get(authHash);
    let existingVersion = 0;
    if (existingProfile) {
      existingVersion = existingProfile.version;
      if (existingProfile.version > version) {
        throw errors.CONFLICT({
          data: {
            ...existingProfile,
            userAgent: transformUserAgent(existingProfile.userAgent),
          },
        });
      }
    }

    const newVersion = existingVersion + 1;
    const newProfile: StoredProfile = {
      data,
      version: newVersion,
      updatedAt: Date.now(),
      userAgent: context.reqHeaders?.get("user-agent") ?? "",
    };
    await settingsStoreClient.set(authHash, newProfile);
    return {
      ...newProfile,
      userAgent: transformUserAgent(newProfile.userAgent),
    };
  });

export const router = {
  profiles: {
    fetch: fetchProfiles,
    fetchMetadata: fetchMetadata,
    upload: uploadProfiles,
  },
};
