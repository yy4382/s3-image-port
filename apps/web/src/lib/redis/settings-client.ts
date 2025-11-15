import { settingsRecordEncryptedSchema } from "@/modules/settings/sync/types";
import Redis from "ioredis";
import { z } from "zod";
import { getRedisClient } from "./client";

export interface SettingsStoreClient {
  get(
    authHash: string,
  ): Promise<z.infer<typeof settingsRecordEncryptedSchema> | null>;
  set(
    authHash: string,
    data: z.infer<typeof settingsRecordEncryptedSchema>,
  ): Promise<void>;
}

class SettingsStoreClientRedis implements SettingsStoreClient {
  private redis: Redis | null = null;
  readonly keyPrefix = "profile:sync:";

  private getRedis(): Redis {
    if (!this.redis) {
      this.redis = getRedisClient();
    }
    return this.redis;
  }

  private getProfileKey(authHash: string): string {
    return `${this.keyPrefix}${authHash}`;
  }

  async get(
    authHash: string,
  ): Promise<z.infer<typeof settingsRecordEncryptedSchema> | null> {
    const redis = this.getRedis();
    const key = this.getProfileKey(authHash);
    const value = await redis.get(key);
    if (!value) {
      return null;
    }
    return settingsRecordEncryptedSchema.parse(JSON.parse(value));
  }

  async set(
    authHash: string,
    data: z.infer<typeof settingsRecordEncryptedSchema>,
  ): Promise<void> {
    const redis = this.getRedis();
    const key = this.getProfileKey(authHash);
    await redis.set(key, JSON.stringify(data));
  }
}

export const settingsStoreClient = new SettingsStoreClientRedis();
