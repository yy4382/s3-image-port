import { os } from "@orpc/server";
import { z } from "zod";
import { RequestHeadersPluginContext } from "@orpc/server/plugins";

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
});
