import { z } from "zod";

export const storageKeySchema = z.string().min(1);

export const storageAccessMethodSchema = z.enum([
  "GET",
  "HEAD",
  "PUT",
  "POST",
  "DELETE",
]);

export const requiredStorageAccessMethods = storageAccessMethodSchema.options;

export const storedImageSchema = z.object({
  key: storageKeySchema,
  url: z.url(),
  lastModified: z.string().optional(),
});

export const storedImageMetadataSchema = z.object({
  key: storageKeySchema,
  lastModified: z.string().optional(),
  contentType: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
});

export const storedImageDownloadSchema = z.object({
  key: storageKeySchema,
  body: z.instanceof(Blob),
});

export const imageStorageFailureSchema = z.discriminatedUnion("reason", [
  z.object({ reason: z.literal("not-configured") }),
  z.object({ reason: z.literal("not-found"), key: storageKeySchema }),
  z.object({ reason: z.literal("already-exists"), key: storageKeySchema }),
  z.object({ reason: z.literal("access-denied") }),
  z.object({
    reason: z.literal("cors-incomplete"),
    allowedMethods: z.array(storageAccessMethodSchema),
    missingMethods: z.array(storageAccessMethodSchema),
  }),
  z.object({
    reason: z.literal("partial-rename"),
    copiedKey: storageKeySchema,
    failedDeleteKey: storageKeySchema,
  }),
  z.object({
    reason: z.literal("unknown"),
    message: z.string(),
    cause: z.unknown().optional(),
  }),
]);

export const imageStorageFailureResultSchema = z.object({
  ok: z.literal(false),
  error: imageStorageFailureSchema,
});

export const storedImageResultSchema = z.union([
  z.object({ ok: z.literal(true), value: storedImageSchema }),
  imageStorageFailureResultSchema,
]);

export const storedImageListResultSchema = z.union([
  z.object({ ok: z.literal(true), value: z.array(storedImageSchema) }),
  imageStorageFailureResultSchema,
]);

export const storedImageDeleteResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    value: z.object({ deletedKeys: z.array(storageKeySchema) }),
  }),
  imageStorageFailureResultSchema,
]);

export const storedImageRenameResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    value: z.object({
      oldKey: storageKeySchema,
      newKey: storageKeySchema,
    }),
  }),
  imageStorageFailureResultSchema,
]);

export const storedImageDownloadResultSchema = z.union([
  z.object({ ok: z.literal(true), value: storedImageDownloadSchema }),
  imageStorageFailureResultSchema,
]);

export const storedImageMetadataResultSchema = z.union([
  z.object({ ok: z.literal(true), value: storedImageMetadataSchema }),
  imageStorageFailureResultSchema,
]);

export const imageStorageAccessResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    value: z.object({
      allowedMethods: z.array(storageAccessMethodSchema),
    }),
  }),
  imageStorageFailureResultSchema,
]);

export type StorageKey = z.infer<typeof storageKeySchema>;
export type StorageAccessMethod = z.infer<typeof storageAccessMethodSchema>;
export type StoredImage = z.infer<typeof storedImageSchema>;
export type StoredImageMetadata = z.infer<typeof storedImageMetadataSchema>;
export type StoredImageDownload = z.infer<typeof storedImageDownloadSchema>;
export type ImageStorageFailure = z.infer<typeof imageStorageFailureSchema>;
export type ImageStorageFailureResult = z.infer<
  typeof imageStorageFailureResultSchema
>;
export type StoredImageResult = z.infer<typeof storedImageResultSchema>;
export type StoredImageListResult = z.infer<typeof storedImageListResultSchema>;
export type StoredImageDeleteResult = z.infer<
  typeof storedImageDeleteResultSchema
>;
export type StoredImageRenameResult = z.infer<
  typeof storedImageRenameResultSchema
>;
export type StoredImageDownloadResult = z.infer<
  typeof storedImageDownloadResultSchema
>;
export type StoredImageMetadataResult = z.infer<
  typeof storedImageMetadataResultSchema
>;
export type ImageStorageAccessResult = z.infer<
  typeof imageStorageAccessResultSchema
>;
