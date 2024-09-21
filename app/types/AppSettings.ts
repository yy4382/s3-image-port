import { z } from "zod";
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export const convertTypes = ["none", "jpg", "webp"] as const;
export type ConvertSettings = {
  convertType: (typeof convertTypes)[number];
  compressionMaxSize: number | "";
  compressionMaxWidthOrHeight: number | "";
};
export type FileUploadSettings = ConvertSettings & {
  keyTemplate: string;
};

type GallerySettings = {
  enableAutoRefresh: boolean;
  enableFuzzySearch: boolean;
  fuzzySearchThreshold: number;
};

export type AppSettings = Prettify<
  FileUploadSettings &
    GallerySettings & {
      noLongerShowRootPage: boolean;
    }
>;

export const fileUploadSettingsSchema = z.object({
  convertType: z.enum(convertTypes),
  compressionMaxSize: z.union([z.number().min(0), z.literal("")]),
  compressionMaxWidthOrHeight: z.union([z.number().min(1), z.literal("")]),
  keyTemplate: z.union([z.string().endsWith(".{{ext}}"), z.literal("")]),
});

export const gallerySettingsSchema = z.object({
  enableAutoRefresh: z.boolean(),
  enableFuzzySearch: z.boolean(),
  fuzzySearchThreshold: z.number().min(0).max(1),
});

export const appMiscSettingsSchema = z.object({
  noLongerShowRootPage: z.boolean(),
});

export const appSettingsSchema = appMiscSettingsSchema
  .merge(fileUploadSettingsSchema)
  .merge(gallerySettingsSchema);
