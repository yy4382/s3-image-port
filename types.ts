export interface Photo {
  Key: string;
  LastModified: Date;
  category: string;
  url: string;
}
export const convertType = ["none", "jpg", "webp"];

export interface S3Config {
  endpoint: string;
  bucket: string;
  region: string;
  accKeyId: string;
  secretAccKey: string;
}

export interface Settings {
  token: string;
  convert: string;
}

export const DEFAULT_SETTINGS: Settings = {
  token: "",
  convert: "webp",
};
