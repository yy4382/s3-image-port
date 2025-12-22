import Redis from "ioredis";

enum RedisAvailability {
  UNKNOWN = "UNKNOWN",
  AVAILABLE = "AVAILABLE",
  UNAVAILABLE = "UNAVAILABLE",
}

let redis: Redis | null = null;
let redisAvailability: RedisAvailability = RedisAvailability.UNKNOWN;
let startupLoggedOnce = false;

/**
 * Get or create a Redis client instance
 * Returns null if Redis is not configured or unavailable
 */
export function getRedisClient(): Redis | null {
  if (redis) {
    return redis;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    // Mark as unavailable and log once
    redisAvailability = RedisAvailability.UNAVAILABLE;
    if (!startupLoggedOnce) {
      console.warn(
        "[Redis] REDIS_URL not configured. Profile sync feature is disabled.",
      );
      console.warn(
        "[Redis] Set REDIS_URL environment variable to enable profile sync.",
      );
      startupLoggedOnce = true;
    }
    return null;
  }

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    // Connection pool settings
    enableOfflineQueue: true,
    // Reconnection strategy
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redis.on("error", (err) => {
    // Only log when transitioning from AVAILABLE to UNAVAILABLE
    if (redisAvailability === RedisAvailability.AVAILABLE) {
      console.error("[Redis] Connection lost:", err.message);
      console.error(
        "[Redis] Profile sync endpoints will return 503 until connection is restored.",
      );
      redisAvailability = RedisAvailability.UNAVAILABLE;
    }
  });

  redis.on("connect", () => {
    // Log restoration if we were previously unavailable
    if (redisAvailability === RedisAvailability.UNAVAILABLE) {
      console.log("[Redis] Connection restored. Profile sync is operational.");
    } else {
      console.log("[Redis] Connected successfully.");
    }
    redisAvailability = RedisAvailability.AVAILABLE;
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
