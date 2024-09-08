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

export type SortByOpts = "date" | "key";
