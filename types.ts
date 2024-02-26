export interface Photo {
  Key: string;
  LastModified: Date;
  category: string;
  url: string;
}
export const convertType = ["none", "jpg", "webp"];

export interface Settings {
  endpoint: string;
  accKeyId: string;
  secretAccKey: string;
  bucket: string;
  region: string;
  convert: string;
}

export const DEFAULT_SETTINGS: Settings = {
  endpoint: "",
  accKeyId: "",
  secretAccKey: "",
  bucket: "",
  region: "auto",
  convert: "webp",
};
