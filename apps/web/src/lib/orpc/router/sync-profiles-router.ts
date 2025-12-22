import { z } from "zod";
import { encryptedDataSchema } from "@/lib/encryption/types";
import { sha256 } from "@/lib/utils/hash";
import {
  settingsRecordEncryptedSchema,
  settingsResponseSchema,
  userAgentResponseSchema,
} from "@/modules/settings/sync/types";
import { baseOs, withRedisCheck } from "./base-router";
import { settingsStoreClient } from "@/lib/redis/settings-client";
import { UAParser } from "ua-parser-js";
import { uploadRateLimitByIp, uploadRateLimitByToken } from "../rate-limit";

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
  .use(withRedisCheck)
  .errors({
    // using BAD_REQUEST instead of NOT_FOUND because nitro erases all header and body
    // in 404 responses
    BAD_REQUEST: {
      data: z.object({
        type: z.enum(["no-such-user"]),
      }),
    },
  })
  .input(z.object({ token: z.string().nonempty() }))
  .output(settingsResponseSchema)
  .handler(async ({ input, errors }) => {
    const authToken = input.token;
    const authHash = await computeAuthHash(authToken);
    const stored = await settingsStoreClient.get(authHash);
    if (!stored) {
      throw errors.BAD_REQUEST({
        data: {
          type: "no-such-user",
        },
      });
    }
    return {
      ...stored,
      userAgent: transformUserAgent(stored.userAgent),
    };
  });

const fetchMetadata = baseOs
  .use(withRedisCheck)
  .errors({
    // using BAD_REQUEST instead of NOT_FOUND because nitro erases all header and body
    // in 404 responses
    BAD_REQUEST: {
      data: z.object({
        type: z.enum(["no-such-user"]),
      }),
    },
  })
  .input(z.object({ token: z.string().nonempty() }))
  .output(settingsResponseSchema.omit({ data: true }))
  .handler(async ({ input, errors }) => {
    const authHash = await computeAuthHash(input.token);
    const stored = await settingsStoreClient.get(authHash);
    if (!stored) {
      throw errors.BAD_REQUEST({
        data: {
          type: "no-such-user",
        },
      });
    }
    return settingsResponseSchema.omit({ data: true }).decode({
      ...stored,
      userAgent: transformUserAgent(stored.userAgent),
    });
  });

const uploadProfiles = baseOs
  .use(withRedisCheck)
  .errors({
    PAYLOAD_TOO_LARGE: {
      message: "Payload too large, max 1MB",
    },
    CONFLICT: {
      message: "Version conflict",
      data: settingsResponseSchema,
    },
    TOO_MANY_REQUESTS: {
      status: 429,
      data: z.object({
        limit: z.number(),
        remaining: z.number(),
        reset: z.number(),
      }),
    },
  })
  .input(
    z.object({
      data: encryptedDataSchema,
      version: z.number().int().nonnegative().or(z.literal("force")),
      token: z.string().nonempty(),
    }),
  )
  .use(uploadRateLimitByIp)
  .use(uploadRateLimitByToken)
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
      if (typeof version === "number" && existingProfile.version > version) {
        throw errors.CONFLICT({
          data: {
            ...existingProfile,
            userAgent: transformUserAgent(existingProfile.userAgent),
          },
        });
      }
    }

    const newVersion = existingVersion + 1;
    const rawUserAgent = context.reqHeaders?.get("user-agent") ?? "";
    const sanitizedUserAgent = rawUserAgent.slice(0, 500); // Limit length to prevent abuse
    const newProfile: StoredProfile = {
      data,
      version: newVersion,
      updatedAt: Date.now(),
      userAgent: sanitizedUserAgent,
    };

    // Use atomic compare-and-swap to prevent race conditions
    if (version === "force") {
      await settingsStoreClient.set(authHash, newProfile);
    } else {
      const success = await settingsStoreClient.setIfVersionMatches(
        authHash,
        newProfile,
        existingVersion,
      );
      if (!success) {
        // Version changed between read and write, re-fetch and throw conflict
        const updatedProfile = await settingsStoreClient.get(authHash);
        if (updatedProfile) {
          throw errors.CONFLICT({
            data: {
              ...updatedProfile,
              userAgent: transformUserAgent(updatedProfile.userAgent),
            },
          });
        }
      }
    }

    return {
      ...newProfile,
      userAgent: transformUserAgent(newProfile.userAgent),
    };
  });

const deleteProfile = baseOs
  .use(withRedisCheck)
  .errors({
    BAD_REQUEST: {
      data: z.object({
        type: z.enum(["no-such-user"]),
      }),
    },
  })
  .input(z.object({ token: z.string().nonempty() }))
  .output(z.object({ success: z.boolean() }))
  .handler(async ({ input, errors }) => {
    const authHash = await computeAuthHash(input.token);
    const stored = await settingsStoreClient.get(authHash);
    if (!stored) {
      throw errors.BAD_REQUEST({
        data: {
          type: "no-such-user",
        },
      });
    }
    await settingsStoreClient.delete(authHash);
    return { success: true };
  });

export const profilesRouter = {
  fetch: fetchProfiles,
  fetchMetadata: fetchMetadata,
  upload: uploadProfiles,
  delete: deleteProfile,
};
