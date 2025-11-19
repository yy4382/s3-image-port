import { settingsRecordEncryptedSchema } from "@/modules/settings/sync/types";
import Redis from "ioredis";
import { z } from "zod";
import { getRedisClient } from "./client";
import { PROFILE_TTL_SECONDS } from "./ttl-config";

export interface SettingsStoreClient {
  readonly TTL_SECONDS: number;

  get(
    authHash: string,
  ): Promise<z.infer<typeof settingsRecordEncryptedSchema> | null>;
  set(
    authHash: string,
    data: z.infer<typeof settingsRecordEncryptedSchema>,
  ): Promise<void>;
  setIfVersionMatches(
    authHash: string,
    data: z.infer<typeof settingsRecordEncryptedSchema>,
    expectedVersion: number,
  ): Promise<boolean>;
  delete(authHash: string): Promise<void>;
}

class SettingsStoreClientRedis implements SettingsStoreClient {
  private redis: Redis | null = null;
  readonly keyPrefix = "profile:sync:";
  readonly TTL_SECONDS = PROFILE_TTL_SECONDS;

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
    // Refresh TTL on access to keep active accounts alive
    await redis.expire(key, this.TTL_SECONDS);
    return settingsRecordEncryptedSchema.parse(JSON.parse(value));
  }

  async set(
    authHash: string,
    data: z.infer<typeof settingsRecordEncryptedSchema>,
  ): Promise<void> {
    const redis = this.getRedis();
    const key = this.getProfileKey(authHash);
    await redis.set(key, JSON.stringify(data), "EX", this.TTL_SECONDS);
  }

  async setIfVersionMatches(
    authHash: string,
    data: z.infer<typeof settingsRecordEncryptedSchema>,
    expectedVersion: number,
  ): Promise<boolean> {
    const redis = this.getRedis();
    const key = this.getProfileKey(authHash);
    const newData = JSON.stringify(data);

    // Lua script for atomic compare-and-swap based on version
    const script = `
      local key = KEYS[1]
      local expectedVersion = tonumber(ARGV[1])
      local newData = ARGV[2]
      local ttl = tonumber(ARGV[3])

      local current = redis.call('GET', key)

      -- If key doesn't exist, only allow version 1
      if not current then
        if expectedVersion == 0 then
          redis.call('SET', key, newData, 'EX', ttl)
          return 1
        else
          return 0
        end
      end

      -- Parse current version
      local currentData = cjson.decode(current)
      local currentVersion = tonumber(currentData.version)

      -- Check version match
      if currentVersion == expectedVersion then
        redis.call('SET', key, newData, 'EX', ttl)
        return 1
      else
        return 0
      end
    `;

    const result = await redis.eval(
      script,
      1,
      key,
      expectedVersion,
      newData,
      this.TTL_SECONDS,
    );
    return result === 1;
  }

  async delete(authHash: string): Promise<void> {
    const redis = this.getRedis();
    const key = this.getProfileKey(authHash);
    await redis.del(key);
  }
}

export const settingsStoreClient: SettingsStoreClient =
  new SettingsStoreClientRedis();
