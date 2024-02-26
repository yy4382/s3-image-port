export interface Photo {
  Key: string;
  LastModified: Date;
  category: string;
  url: string;
}
export interface Settings {
  endpoint: string;
  accKeyId: string;
  secretAccKey: string;
  bucket: string;
  region: string;
}

export const DEFAULT_SETTINGS: Settings = {
  endpoint: "",
  accKeyId: "",
  secretAccKey: "",
  bucket: "",
  region: "auto",
};
