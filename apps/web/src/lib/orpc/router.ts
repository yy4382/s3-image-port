import { z } from "zod";
import { getRedisClient } from "../redis/client";
import { encryptedDataSchema } from "../encryption/types";
import { sha256 } from "../utils/hash";
import { settingsInDbEncryptedSchema } from "@/modules/settings/sync/types";
import { baseOs } from "./base-router";

const PROFILE_KEY_PREFIX = "profile:sync:";
const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

type StoredProfile = z.infer<typeof settingsInDbEncryptedSchema>;

/**
 * Get the Redis key for a profile using the hashed auth token
 */
function getProfileKey(authHash: string): string {
  return `${PROFILE_KEY_PREFIX}${authHash}`;
}

async function computeAuthHash(token: string): Promise<string> {
  return sha256(token);
}

const fetchProfiles = baseOs
  .errors({
    NOT_FOUND: {
      message: "Profile not found",
    },
  })
  .input(z.object({ token: z.string().nonempty() }))
  .handler(async ({ input, errors }) => {
    const authToken = input.token;
    const authHash = await computeAuthHash(authToken);
    const redis = getRedisClient();
    const key = getProfileKey(authHash);
    const stored = await redis.get(key);
    if (!stored) {
      throw errors.NOT_FOUND();
    }
    return settingsInDbEncryptedSchema.parse(JSON.parse(stored));
  });

const uploadProfiles = baseOs
  .errors({
    PAYLOAD_TOO_LARGE: {
      message: "Payload too large, max 1MB",
    },
    CONFLICT: {
      message: "Version conflict",
      data: settingsInDbEncryptedSchema,
    },
  })
  .input(
    z.object({
      data: encryptedDataSchema,
      version: z.number().int().nonnegative(),
      token: z.string().nonempty(),
    }),
  )
  .handler(async ({ input, errors }) => {
    const { token, data, version } = input;
    if (JSON.stringify(data).length > MAX_PAYLOAD_SIZE) {
      throw errors.PAYLOAD_TOO_LARGE();
    }
    const authHash = await computeAuthHash(token);

    const redis = getRedisClient();
    const key = getProfileKey(authHash);
    const existing = await redis.get(key);
    let existingVersion = 0;
    if (existing) {
      const existingProfile = settingsInDbEncryptedSchema.parse(
        JSON.parse(existing),
      );
      existingVersion = existingProfile.version;
      if (existingProfile.version > version) {
        throw errors.CONFLICT({ data: existingProfile });
      }
    }

    const newVersion = existingVersion + 1;
    const newProfile: StoredProfile = {
      data,
      version: newVersion,
      updatedAt: Date.now(),
    };
    await redis.set(key, JSON.stringify(newProfile));
    return newProfile;
  });

export const router = {
  profiles: {
    fetch: fetchProfiles,
    upload: uploadProfiles,
  },
};
