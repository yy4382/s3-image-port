import { z } from "zod";

export interface Photo {
  Key: string;
  LastModified: string;
  category: string;
  url: string;
}

export interface S3Config {
  endpoint: string;
  bucket: string;
  region: string;
  accKeyId: string;
  secretAccKey: string;
  pubUrl: string;
}

export const s3ConfigSchema = z.object({
  endpoint: z.string().url(),
  bucket: z.string(),
  region: z.string(),
  accKeyId: z.string(),
  secretAccKey: z.string(),
  pubUrl: z.union([z.string().url(), z.string().length(0)]),
});

export type ConvertType = "none" | "jpg" | "webp";
export const convertTypes: ConvertType[] = ["none", "jpg", "webp"];
export interface AppSettings {
  convertType: ConvertType;
  keyTemplate: string;
}

export const appSettingsSchema = z.object({
  convertType: z.enum(["none", "jpg", "webp"]),
});
