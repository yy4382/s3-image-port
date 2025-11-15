import { RPCHandler } from "@orpc/server/fetch";
import { createFileRoute } from "@tanstack/react-router";
import { router } from "@/lib/orpc/router";
import { onError, ORPCError, ValidationError } from "@orpc/server";
import { z } from "zod";
import { RequestHeadersPlugin } from "@orpc/server/plugins";

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
  clientInterceptors: [
    onError((error) => {
      if (
        error instanceof ORPCError &&
        error.code === "BAD_REQUEST" &&
        error.cause instanceof ValidationError
      ) {
        // If you only use Zod you can safely cast to ZodIssue[]
        const zodError = new z.ZodError(
          error.cause.issues as z.core.$ZodIssue[],
        );

        throw new ORPCError("INPUT_VALIDATION_FAILED", {
          status: 422,
          message: z.prettifyError(zodError),
          data: z.flattenError(zodError),
          cause: error.cause,
        });
      }
    }),
  ],
  plugins: [new RequestHeadersPlugin()],
});

export const Route = createFileRoute("/api/rpc/$")({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        const { response } = await handler.handle(request, {
          prefix: "/api/rpc",
          context: {}, // Provide initial context if needed
        });

        return response ?? new Response("Not Found", { status: 404 });
      },
    },
  },
});
