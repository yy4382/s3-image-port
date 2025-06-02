import { atomWithStorageMigration } from "@/lib/atoms/atomWithStorageMigration";
import { defaultKeyTemplate } from "@/lib/utils/generateKey";
import { focusAtom } from "jotai-optics";
import { keyTemplateSchema } from "./upload/KeyTemplate";
import z from "zod/v4";
import { compressOptionSchema } from "@/lib/utils/imageCompress";
import { atom } from "jotai";

export const s3SettingsSchema = z.object({
  endpoint: z.url(),
  bucket: z.string().min(1, "Cannot be empty"),
  region: z.string().min(1, "Cannot be empty"),
  accKeyId: z.string().min(1, "Cannot be empty"),
  secretAccKey: z.string().min(1, "Cannot be empty"),
  forcePathStyle: z.boolean(),
  pubUrl: z.url(),
});

export type S3Options = z.infer<typeof s3SettingsSchema>;

export const uploadSettingsSchema = z.object({
  keyTemplate: keyTemplateSchema,
  compressionOption: compressOptionSchema.nullable(),
});

export type UploadOptions = z.infer<typeof uploadSettingsSchema>;

export const gallerySettingsSchema = z.object({
  autoRefresh: z.boolean(),
});

export type GalleryOptions = z.infer<typeof gallerySettingsSchema>;

export const optionsSchema = z.object({
  s3: s3SettingsSchema,
  upload: uploadSettingsSchema,
  gallery: gallerySettingsSchema,
});

export type Options = z.infer<typeof optionsSchema>;

export const optionsAtom = atomWithStorageMigration<Options>(
  "s3ip:options",
  {
    s3: {
      endpoint: "",
      bucket: "",
      region: "",
      accKeyId: "",
      secretAccKey: "",
      forcePathStyle: false,
      pubUrl: "",
    },
    upload: {
      keyTemplate: defaultKeyTemplate,
      compressionOption: null,
    },
    gallery: {
      autoRefresh: true,
    },
  },
  undefined,
  {
    version: 1,
    migrate(_stored, _oldVersion, initialValue) {
      return initialValue;
    },
  },
);

export const s3SettingsAtom = focusAtom(optionsAtom, (optic) =>
  optic.prop("s3"),
);

export const uploadSettingsAtom = focusAtom(optionsAtom, (optic) =>
  optic.prop("upload"),
);

export const gallerySettingsAtom = focusAtom(optionsAtom, (optic) =>
  optic.prop("gallery"),
);

export const validS3SettingsAtom = atom((get) => {
  const settings = get(s3SettingsAtom);
  const result = s3SettingsSchema.safeParse(settings);
  if (result.success) {
    return result.data;
  }
  return undefined;
});

/**
 * Try to migrate from v1 (nuxt version) to current version
 */
export function tryMigrateFromV1(): Options {
  const oldS3SettingsStr = localStorage.getItem("s3-settings");
  const oldAppSettingsStr = localStorage.getItem("app-settings");

  if (!oldS3SettingsStr || !oldAppSettingsStr) {
    throw new Error("No old settings found");
  }

  if (oldAppSettingsStr) {
    localStorage.removeItem("app-settings");
  }
  if (oldS3SettingsStr) {
    localStorage.removeItem("s3-settings");
  }

  let oldS3Settings: Record<string, unknown>;
  let oldAppSettings: Record<string, unknown>;

  try {
    oldS3Settings = JSON.parse(oldS3SettingsStr);
    oldAppSettings = JSON.parse(oldAppSettingsStr);
  } catch (error) {
    console.error(error);
    throw new Error("Failed to parse old settings");
  }

  const newOptions: Options = {
    s3: {
      endpoint: String(oldS3Settings?.endpoint ?? ""),
      bucket: String(oldS3Settings?.bucket ?? ""),
      region: String(oldS3Settings?.region ?? ""),
      accKeyId: String(oldS3Settings?.accKeyId ?? ""),
      secretAccKey: String(oldS3Settings?.secretAccKey ?? ""),
      forcePathStyle: Boolean(oldS3Settings?.forcePathStyle ?? false),
      pubUrl: String(oldS3Settings?.pubUrl ?? ""),
    },
    upload: {
      keyTemplate: String(oldAppSettings?.keyTemplate ?? ""),
      compressionOption: null,
    },
    gallery: {
      autoRefresh: Boolean(oldAppSettings?.enableAutoRefresh ?? true),
    },
  };
  return newOptions;
}
