import { z } from "zod";
import { defaultKeyTemplate } from "@/lib/s3/s3-key";

export const getDefaultOptions = (): z.infer<typeof optionsSchema> => {
  return {
    s3: {
      endpoint: "",
      bucket: "",
      region: "",
      accKeyId: "",
      secretAccKey: "",
      forcePathStyle: false,
      pubUrl: "",
      includePath: "",
    },
    upload: {
      keyTemplate: defaultKeyTemplate,
      keyTemplatePresets: [],
      compressionOption: null,
    },
    gallery: {
      autoRefresh: true,
    },
  };
};

const s3SettingsSchema = z.object({
  endpoint: z.url(),
  bucket: z.string().min(1, "Cannot be empty"),
  region: z.string().min(1, "Cannot be empty"),
  accKeyId: z.string().min(1, "Cannot be empty"),
  secretAccKey: z.string().min(1, "Cannot be empty"),
  forcePathStyle: z.boolean(),
  pubUrl: z.url(),
  includePath: z.string(),
});

const s3SettingsSchemaForLoad = z.object({
  endpoint: z.string().catch(""),
  bucket: z.string().catch(""),
  region: z.string().catch(""),
  accKeyId: z.string().catch(""),
  secretAccKey: z.string().catch(""),
  forcePathStyle: z.boolean().catch(false),
  pubUrl: z.string().catch(""),
  includePath: z.string().catch(""),
});

const compressOptionSchema = z.union([
  z.object({
    type: z.literal("avif"),
    quality: z.number().min(0).max(100),
  }),
  z.object({
    type: z.literal("jpeg"),
    quality: z.number().min(0).max(100),
  }),
  z.object({
    type: z.literal("webp"),
    quality: z.number().min(0).max(100),
  }),
  z.object({
    type: z.literal("png"),
  }),
]);
const keyTemplateSchema = z.string().min(1, "Key template cannot be empty");

const uploadSettingsSchema = z.object({
  keyTemplate: keyTemplateSchema,
  keyTemplatePresets: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .optional(),
  compressionOption: compressOptionSchema.nullable(),
});

const uploadSettingsSchemaForLoad = z.object({
  keyTemplate: keyTemplateSchema.catch(defaultKeyTemplate),
  keyTemplatePresets: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .optional(),
  compressionOption: compressOptionSchema.nullable().catch(null),
});

const gallerySettingsSchema = z.object({
  autoRefresh: z.boolean(),
});

const gallerySettingsSchemaForLoad = z.object({
  autoRefresh: z.boolean().catch(true),
});

export const optionsSchema = z.object({
  s3: s3SettingsSchema,
  upload: uploadSettingsSchema,
  gallery: gallerySettingsSchema,
});

export const optionsSchemaForLoad = z.object({
  s3: s3SettingsSchemaForLoad.catch(getDefaultOptions().s3),
  upload: uploadSettingsSchemaForLoad.catch(getDefaultOptions().upload),
  gallery: gallerySettingsSchemaForLoad.catch(getDefaultOptions().gallery),
});

export const profilesSchema = z
  .object({
    list: z
      .array(z.tuple([z.string(), optionsSchema]))
      .min(1, "At least one profile is required"),
    current: z.number(),
  })
  .refine(
    (data) =>
      Number.isInteger(data.current) &&
      data.current >= 0 &&
      data.current < data.list.length,
    { message: "Current profile index is out of range", path: ["current"] },
  );

export const getDefaultProfiles = (): z.infer<typeof profilesSchema> => {
  return {
    list: [["Default", getDefaultOptions()]],
    current: 0,
  };
};

export const profilesSchemaForLoad = z.object({
  list: z
    .array(z.tuple([z.string(), optionsSchemaForLoad]))
    .min(1)
    .catch([["Default", getDefaultOptions()]]),
  current: z.number().catch(0),
});
