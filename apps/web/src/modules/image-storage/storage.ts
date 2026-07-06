import type {
  ImageStorageAccessResult,
  StoredImageDeleteResult,
  StoredImageDownloadResult,
  StoredImageListResult,
  StoredImageMetadataResult,
  StoredImageRenameResult,
  StoredImageResult,
} from "./schema";

export type StoredImageBody = Blob | string;

export type PutStoredImageInput = {
  key: string;
  body: StoredImageBody;
  contentType?: string;
};

export type RenameStoredImageInput = {
  oldKey: string;
  newKey: string;
  overwrite?: boolean;
};

export type CheckStorageAccessInput = {
  origin: string;
};

export type ImageStorage = {
  listStoredImages(): Promise<StoredImageListResult>;
  putStoredImage(input: PutStoredImageInput): Promise<StoredImageResult>;
  deleteStoredImages(keys: readonly string[]): Promise<StoredImageDeleteResult>;
  renameStoredImage(
    input: RenameStoredImageInput,
  ): Promise<StoredImageRenameResult>;
  downloadStoredImage(key: string): Promise<StoredImageDownloadResult>;
  probeStoredImage(key: string): Promise<StoredImageMetadataResult>;
  checkAccess(
    input: CheckStorageAccessInput,
  ): Promise<ImageStorageAccessResult>;
};
