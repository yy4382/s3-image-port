import {
  imageStorageFailureSchema,
  storedImageSchema,
} from "@/modules/image-storage";
import { z } from "zod";

// A receipt contains only the actual destination and public URL, never credentials.
export const uploadReceiptSchema = z.object({
  endpoint: z.string(),
  bucket: z.string(),
  region: z.string(),
  url: z.string(),
});

export const pendingUploadResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.enum(["stored", "stored-unreconciled", "stored-previous-target"]),
    image: storedImageSchema,
    receipt: uploadReceiptSchema,
  }),
  z.object({
    status: z.literal("processing-failed"),
    uploadAfterProcessing: z.boolean(),
  }),
  z.object({
    status: z.literal("unconfirmed"),
    error: imageStorageFailureSchema,
  }),
  z.object({
    status: z.literal("failed"),
    error: z.union([
      imageStorageFailureSchema,
      z.object({ reason: z.literal("target-mismatch") }),
    ]),
  }),
]);

export type PendingUploadResult = z.infer<typeof pendingUploadResultSchema>;
export type StoredUploadResult = Extract<
  PendingUploadResult,
  { image: unknown }
>;

export function isStoredUpload(
  result: PendingUploadResult | null,
): result is StoredUploadResult {
  return result !== null && "image" in result;
}
