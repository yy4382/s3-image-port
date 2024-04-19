export interface Photo {
  Key: string;
  LastModified: string;
  category: string;
  url: string;
}
export type ConvertType = "none" | "jpg" | "webp";
export const convertTypes: ConvertType[] = ["none", "jpg", "webp"];

export interface S3Config {
  endpoint: string;
  bucket: string;
  region: string;
  accKeyId: string;
  secretAccKey: string;
}

export interface AppSettings  {
  convertType: ConvertType,
  pubUrl: string,
}

export interface Settings {
  token: string;
  convert: string;
}

export const DEFAULT_SETTINGS: Settings = {
  token: "",
  convert: "webp",
};
