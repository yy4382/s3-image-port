import { encryptedDataSchema } from "@/lib/encryption/types";
import { z } from "zod";
import { settingsForSyncSchema } from "@/stores/schemas/settings";

const settingsRecordSchemaBase = z.object({
  version: z.number().int(),
  updatedAt: z.number(),
});

export const userAgentResponseSchema = z.object({
  browser: z.string().optional(),
  os: z.string().optional(),
});

export const settingsRecordEncryptedSchema = settingsRecordSchemaBase.extend({
  data: encryptedDataSchema,
  userAgent: z.string(),
});

export const settingsResponseSchema = settingsRecordSchemaBase.extend({
  data: encryptedDataSchema,
  userAgent: userAgentResponseSchema.nullable(),
});

export const settingsRecordSchema = settingsRecordSchemaBase.extend({
  data: settingsForSyncSchema,
  userAgent: userAgentResponseSchema.nullable(),
});
