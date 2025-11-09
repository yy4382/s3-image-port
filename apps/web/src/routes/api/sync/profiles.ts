import { createFileRoute } from "@tanstack/react-router";
import { getRedisClient } from "@/lib/redis/client";
import { z } from "zod";
import { encryptedDataSchema } from "@/lib/encryption/types";
import { createHash } from "node:crypto";

const PROFILE_KEY_PREFIX = "profile:sync:";
const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB
const AUTH_HEADER = "x-sync-auth";

// Request/Response schemas
const uploadRequestSchema = z.object({
  userId: z.string().min(1),
  data: encryptedDataSchema,
  version: z.number().int().nonnegative(),
});

const deleteRequestSchema = z.object({
  userId: z.string().min(1),
});

interface StoredProfile {
  data: {
    salt: string;
    iv: string;
    data: string;
    version: number;
  };
  version: number;
  updatedAt: number;
  userId: string;
}

/**
 * Get the Redis key for a profile using the hashed auth token
 */
function getProfileKey(authHash: string): string {
  return `${PROFILE_KEY_PREFIX}${authHash}`;
}

function computeAuthHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Rate limiting check (basic implementation)
 * In production, use a proper rate limiting library like ioredis-based limiter
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(key);

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 }); // 1 minute window
    return true;
  }

  if (limit.count >= 10) {
    return false;
  }

  limit.count++;
  return true;
}

function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: "Missing or invalid auth token" }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export const Route = createFileRoute("/api/sync/profiles")({
  server: {
    handlers: {
      // Retrieve encrypted profile from server
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const userId = url.searchParams.get("userId");
          const authToken = request.headers.get(AUTH_HEADER);

          if (!authToken) {
            return unauthorizedResponse();
          }
          const authHash = computeAuthHash(authToken);

          if (!userId) {
            return new Response(
              JSON.stringify({ error: "Missing userId parameter" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          if (!checkRateLimit(authHash)) {
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded" }),
              { status: 429, headers: { "Content-Type": "application/json" } },
            );
          }

          const redis = getRedisClient();
          const key = getProfileKey(authHash);
          const stored = await redis.get(key);

          if (!stored) {
            return new Response(JSON.stringify(null), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          const profile: StoredProfile = JSON.parse(stored);

          return new Response(JSON.stringify(profile), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error fetching profile:", error);
          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },

      // Upload encrypted profile to server
      POST: async ({ request }) => {
        try {
          const contentLength = request.headers.get("content-length");
          const authToken = request.headers.get(AUTH_HEADER);

          if (!authToken) {
            return unauthorizedResponse();
          }
          const authHash = computeAuthHash(authToken);

          if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
            return new Response(
              JSON.stringify({ error: "Payload too large (max 1MB)" }),
              { status: 413, headers: { "Content-Type": "application/json" } },
            );
          }

          const body = await request.json();
          const parseResult = uploadRequestSchema.safeParse(body);

          if (!parseResult.success) {
            return new Response(
              JSON.stringify({
                error: "Invalid request",
                details: parseResult.error.issues,
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const { userId, data, version } = parseResult.data;

          if (!checkRateLimit(authHash)) {
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded" }),
              { status: 429, headers: { "Content-Type": "application/json" } },
            );
          }

          const redis = getRedisClient();
          const key = getProfileKey(authHash);

          // Check for version conflict (optimistic locking)
          const existing = await redis.get(key);
          if (existing) {
            const existingProfile: StoredProfile = JSON.parse(existing);
            if (existingProfile.version >= version) {
              return new Response(
                JSON.stringify({
                  success: false,
                  conflict: true,
                  currentVersion: existingProfile.version,
                }),
                {
                  status: 409,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }
          }

          // Store the encrypted profile
          const profile: StoredProfile = {
            data,
            version,
            updatedAt: Date.now(),
            userId,
          };

          await redis.set(key, JSON.stringify(profile));

          // Optional: Set TTL for 90 days of inactivity
          await redis.expire(key, 90 * 24 * 60 * 60);

          return new Response(JSON.stringify({ success: true, version }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error uploading profile:", error);
          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },

      // Delete encrypted profile from server
      DELETE: async ({ request }) => {
        try {
          const body = await request.json();
          const authToken = request.headers.get(AUTH_HEADER);

          if (!authToken) {
            return unauthorizedResponse();
          }
          const authHash = computeAuthHash(authToken);

          const parseResult = deleteRequestSchema.safeParse(body);

          if (!parseResult.success) {
            return new Response(
              JSON.stringify({
                error: "Invalid request",
                details: parseResult.error.issues,
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const { userId } = parseResult.data;

          if (!checkRateLimit(authHash)) {
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded" }),
              { status: 429, headers: { "Content-Type": "application/json" } },
            );
          }

          const redis = getRedisClient();
          const key = getProfileKey(authHash);
          await redis.del(key);

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error deleting profile:", error);
          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
