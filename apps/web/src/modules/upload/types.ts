import {
  imageStorageFailureSchema,
  storedImageSchema,
} from "@/modules/image-storage";
import { z } from "zod";

export const pendingUploadResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("stored"), image: storedImageSchema }),
  z.object({
    status: z.literal("stored-unreconciled"),
    image: storedImageSchema,
  }),
  z.object({
    status: z.literal("failed"),
    error: z.union([
      imageStorageFailureSchema,
      z.object({ reason: z.literal("target-mismatch") }),
      z.object({ reason: z.literal("superseded") }),
    ]),
  }),
]);

export type PendingUploadResult = z.infer<typeof pendingUploadResultSchema>;
