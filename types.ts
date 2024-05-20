import { z } from "zod";

export interface Photo {
  Key: string;
  LastModified: string;
  category: string;
  url: string;
}

export interface PhotoToUpload {
  name: string;
  size: number;
}

export interface S3Settings {
  endpoint: string;
  bucket: string;
  region: string;
  accKeyId: string;
  secretAccKey: string;
  pubUrl: string;
}

export const s3SettingsSchema = z.object({
  endpoint: z.string().url(),
  bucket: z.string().min(1, "Required"),
  region: z.string().min(1, "Required"),
  accKeyId: z.string().min(1, "Required"),
  secretAccKey: z.string().min(1, "Required"),
  pubUrl: z.union([z.string().url(), z.string().length(0)]),
});

export type ConvertType = "none" | "jpg" | "webp";
export const convertTypes = ["none", "jpg", "webp"] as const;
export interface AppSettings {
  enableAutoRefresh: boolean;
  enableFuzzySearch: boolean;
  fuzzySearchThreshold: number;
  convertType: ConvertType;
  compressionMaxSize: number | "";
  compressionMaxWidthOrHeight: number | "";
  keyTemplate: string;
}

export const appSettingsSchema = z.object({
  enableAutoRefresh: z.boolean(),
  enableFuzzySearch: z.boolean(),
  fuzzySearchThreshold: z.number().min(0).max(1),
  convertType: z.enum(convertTypes),
  compressionMaxSize: z.union([z.number().min(0), z.string().length(0)]),
  compressionMaxWidthOrHeight: z.union([z.number().min(1), z.string().length(0)]),
  keyTemplate: z.union([z.string().endsWith(".{{ext}}"), z.string().length(0)]),
});

export type SortByOpts = "date" | "key";
