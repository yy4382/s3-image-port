import { encryptedDataSchema } from "@/lib/encryption/types";
import { z } from "zod";
import { syncSettingsStoreSchema } from "../settings-store";

export const settingsInDbEncryptedSchema = z.object({
  data: encryptedDataSchema,
  version: z.number().int(),
  updatedAt: z.number(),
});

export const settingsInDbSchema = z.object({
  data: syncSettingsStoreSchema,
  version: z.number().int(),
  updatedAt: z.number(),
});
