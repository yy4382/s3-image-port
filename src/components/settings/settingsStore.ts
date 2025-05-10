import { atomWithStorageMigration } from "@/utils/atomWithStorageMigration";
import { defaultKeyTemplate } from "@/utils/generateKey";
import { focusAtom } from "jotai-optics";
import { keyTemplateSchema } from "./KeyTemplate";
import z from "zod";
import { compressOptionSchema } from "@/utils/imageCompress";
import { atom } from "jotai";

export const uploadSettingsSchema = z.object({
  keyTemplate: keyTemplateSchema,
  compressionOption: compressOptionSchema.nullable(),
});

export type UploadOptions = z.infer<typeof uploadSettingsSchema>;

export type Options = {
  s3: S3Options;
  upload: UploadOptions;
};

export const [optionsAtom] = atomWithStorageMigration<Options>(
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

export const s3SettingsSchema = z.object({
  endpoint: z.url(),
  bucket: z.string().min(1),
  region: z.string().min(1),
  accKeyId: z.string().min(1),
  secretAccKey: z.string().min(1),
  forcePathStyle: z.boolean(),
  pubUrl: z.url(),
});

export type S3Options = z.infer<typeof s3SettingsSchema>;

export const validS3SettingsAtom = atom((get) => {
  const settings = get(s3SettingsAtom);
  const result = s3SettingsSchema.safeParse(settings);
  if (result.success) {
    return result.data;
  }
  return undefined;
});
