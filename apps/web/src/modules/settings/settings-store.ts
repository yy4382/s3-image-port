import { atomWithStorageMigration } from "@/lib/atoms/atomWithStorageMigration";
import { defaultKeyTemplate } from "@/lib/utils/generateKey";
import { focusAtom } from "jotai-optics";
import { keyTemplateSchema } from "./upload/KeyTemplate";
import z from "zod/v4";
import { compressOptionSchema } from "@/lib/utils/imageCompress";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const s3ProviderAtom = atomWithStorage<"s3" | "b2">("S3_PROVIDER", "s3");

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

export const getDefaultOptions = (): Options => {
  return {
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
  };
};

export const optionsAtom = atomWithStorageMigration<Options>(
  "s3ip:options",
  getDefaultOptions(),
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

export function migrateFromV1(v1ProfileRaw: unknown): Options | Error {
  let v1ProfileRawObject: object;
  if (typeof v1ProfileRaw === "string") {
    try {
      v1ProfileRawObject = JSON.parse(v1ProfileRaw);
    } catch {
      try {
        v1ProfileRawObject = JSON.parse(decodeURIComponent(v1ProfileRaw));
      } catch (error) {
        return new Error("Failed to parse v1 profile", { cause: error });
      }
    }
  } else if (typeof v1ProfileRaw === "object" && v1ProfileRaw !== null) {
    v1ProfileRawObject = v1ProfileRaw;
  } else {
    return new Error("Invalid v1 profile");
  }
  const v1ProfileParsed = z
    .object({
      s3: z.record(z.string(), z.unknown()),
      app: z.record(z.string(), z.unknown()),
    })
    .safeParse(v1ProfileRawObject);
  if (!v1ProfileParsed.success) {
    return new Error("Failed to parse v1 profile", {
      cause: v1ProfileParsed.error,
    });
  }
  const oldS3Settings = v1ProfileParsed.data.s3;
  const oldAppSettings = v1ProfileParsed.data.app;

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
      keyTemplate: String(oldAppSettings?.keyTemplate || defaultKeyTemplate),
      compressionOption: null,
    },
    gallery: {
      autoRefresh: Boolean(oldAppSettings?.enableAutoRefresh ?? true),
    },
  };
  return newOptions;
}
