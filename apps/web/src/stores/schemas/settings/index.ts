import { z } from "zod";
import {
  profilesSchemaForLoad,
  getDefaultProfiles,
  type optionsSchema,
} from "./v3";
import { zodWithVersion } from "@/lib/atoms/atomWithStorageMigration";

export const SETTINGS_STORE_VERSION = 3;

export {
  optionsSchema,
  optionsSchemaForLoad,
  getDefaultOptions,
  profilesSchema,
  profilesSchemaForLoad,
  getDefaultProfiles,
} from "./v3";

/**
 * The schema for the data that will be stored in the local storage.
 *
 * Caution: If used with `atomWithStorageMigration`, the schema will be wrapped with a version number.
 */
export const storedSettingsSchema = profilesSchemaForLoad;
export function getDefaultStoredSettings(): z.infer<
  typeof storedSettingsSchema
> {
  return getDefaultProfiles();
}

export const settingsForSyncSchema = zodWithVersion(
  storedSettingsSchema.omit({ current: true }),
);

export type S3Options = z.infer<typeof optionsSchema.shape.s3>;
