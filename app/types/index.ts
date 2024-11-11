import type { AppSettings } from "./AppSettings";
import type { S3Settings } from "./S3Settings";
export * from "./S3Settings";
export * from "./AppSettings";

export interface UploadedFileLinkObj {
  link: string;
  name: string;
}

export interface Photo {
  Key: string;
  LastModified: string;
  url: string;
}

export type AllSettings = {
  s3: S3Settings;
  app: AppSettings;
};
