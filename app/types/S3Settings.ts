import { z } from "zod";
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
