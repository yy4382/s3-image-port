import { os } from "@orpc/server";
import { z } from "zod";
import { RequestHeadersPluginContext } from "@orpc/server/plugins";
import { RedisUnavailableError } from "@/lib/redis/errors";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ORPCContext extends RequestHeadersPluginContext {}

export const baseOs = os.$context<ORPCContext>().errors({
  INPUT_VALIDATION_FAILED: {
    status: 422,
    data: z.object({
      formErrors: z.array(z.string()),
      fieldErrors: z.record(z.string(), z.array(z.string()).optional()),
    }),
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    data: z.object({
      service: z.string(),
      reason: z.string().optional(),
    }),
  },
});

/**
 * Middleware to catch Redis unavailability and return 503 responses
 */
export const withRedisCheck = baseOs.middleware(async ({ next, errors }) => {
  try {
    return await next({});
  } catch (error) {
    if (error instanceof RedisUnavailableError) {
      throw errors.SERVICE_UNAVAILABLE({
        data: {
          service: "redis",
          reason: "Profile sync backend is not available",
        },
        cause: error,
      });
    }
    throw error;
  }
});
