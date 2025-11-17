import { createRatelimitMiddleware } from "@orpc/experimental-ratelimit";
import type { Ratelimiter } from "@orpc/experimental-ratelimit";
import { MemoryRatelimiter } from "@orpc/experimental-ratelimit/memory";
import { RedisRatelimiter } from "@orpc/experimental-ratelimit/redis";
import type { RequestHeadersPluginContext } from "@orpc/server/plugins";
import { getRedisClient } from "../redis/client";
import { sha256 } from "../utils/hash";

type UploadInput = {
  token: string;
};

type UploadContext = RequestHeadersPluginContext;

type HybridLimiterOptions = {
  prefix: string;
  windowMs: number;
  maxRequests: number;
};

const isTestEnv = process.env.NODE_ENV === "test";

const TOKEN_RATE_LIMIT = isTestEnv
  ? { windowMs: 1_000, maxRequests: 5_000 }
  : { windowMs: 60_000, maxRequests: 6 };

const IP_RATE_LIMIT = isTestEnv
  ? { windowMs: 1_000, maxRequests: 10_000 }
  : { windowMs: 60_000, maxRequests: 30 };

let loggedRedisUnavailable = false;
let loggedRedisFailure = false;

function logRedisUnavailable(error: unknown) {
  if (!loggedRedisUnavailable) {
    console.warn(
      "[rate-limit] Redis unavailable, falling back to in-memory limiter",
      error,
    );
    loggedRedisUnavailable = true;
  }
}

function logRedisFailure(error: unknown) {
  if (!loggedRedisFailure) {
    console.error("[rate-limit] Redis limiter failure", error);
    loggedRedisFailure = true;
  }
}

function createHybridLimiter(options: HybridLimiterOptions): Ratelimiter {
  const memoryLimiter = new MemoryRatelimiter({
    maxRequests: options.maxRequests,
    window: options.windowMs,
  });

  try {
    const redis = getRedisClient();
    const redisLimiter = new RedisRatelimiter({
      eval: redis.eval.bind(redis),
      prefix: options.prefix,
      maxRequests: options.maxRequests,
      window: options.windowMs,
    });

    return {
      async limit(key) {
        try {
          return await redisLimiter.limit(key);
        } catch (error) {
          logRedisFailure(error);
          return memoryLimiter.limit(key);
        }
      },
    };
  } catch (error) {
    logRedisUnavailable(error);
    return memoryLimiter;
  }
}

const uploadTokenLimiter = createHybridLimiter({
  prefix: "profile:sync:ratelimit:",
  ...TOKEN_RATE_LIMIT,
});

const uploadIpLimiter = createHybridLimiter({
  prefix: "profile:sync:ratelimit:",
  ...IP_RATE_LIMIT,
});

function getClientIp(context: UploadContext): string {
  const headers = context.reqHeaders;
  const forwarded = headers?.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }
  const candidates = [
    "cf-connecting-ip",
    "x-real-ip",
    "x-client-ip",
    "fastly-client-ip",
    "true-client-ip",
  ];
  for (const header of candidates) {
    const value = headers?.get(header);
    if (value) {
      return value.trim();
    }
  }
  return "unknown";
}

export const uploadRateLimitByToken = createRatelimitMiddleware<
  UploadContext,
  UploadInput
>({
  limiter: uploadTokenLimiter,
  key: async (_options, input) => {
    const authHash = await sha256(input.token);
    return `token:${authHash}`;
  },
});

export const uploadRateLimitByIp = createRatelimitMiddleware<
  UploadContext,
  UploadInput
>({
  limiter: uploadIpLimiter,
  key: (options) => {
    const ip = getClientIp(options.context);
    return `ip:${ip}`;
  },
});
