import Redis from "ioredis";

let redis: Redis | null = null;

/**
 * Get or create a Redis client instance
 * Uses connection pooling and automatically handles reconnection
 */
export function getRedisClient(): Redis {
  if (redis) {
    return redis;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error(
      "REDIS_URL environment variable is not set. Please configure Redis connection.",
    );
  }

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    // Connection pool settings
    enableOfflineQueue: true,
    // Reconnection strategy
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redis.on("error", (err) => {
    console.error("Redis Client Error:", err);
  });

  redis.on("connect", () => {
    console.log("Redis Client Connected");
  });

  return redis;
}

/**
 * Close the Redis connection
 * Should be called when shutting down the server
 */
export async function closeRedisClient(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

/**
 * Health check for Redis connection
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    if (!redis) {
      return false;
    }
    const result = await redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}
