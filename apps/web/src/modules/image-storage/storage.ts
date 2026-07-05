import type {
  ImageStorageAccessResult,
  StoredImageDeleteResult,
  StoredImageDownloadResult,
  StoredImageListResult,
  StoredImageMetadataResult,
  StoredImageRenameResult,
  StoredImageResult,
} from "./schema";
import {
  imageStorageAccessResultSchema,
  storedImageDeleteResultSchema,
  storedImageDownloadResultSchema,
  storedImageListResultSchema,
  storedImageMetadataResultSchema,
  storedImageRenameResultSchema,
  storedImageResultSchema,
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

export type ImageStorageAdapter = ImageStorage;

export function createImageStorage(adapter: ImageStorageAdapter): ImageStorage {
  return {
    async listStoredImages() {
      return storedImageListResultSchema.parse(
        await adapter.listStoredImages(),
      );
    },
    async putStoredImage(input) {
      return storedImageResultSchema.parse(await adapter.putStoredImage(input));
    },
    async deleteStoredImages(keys) {
      return storedImageDeleteResultSchema.parse(
        await adapter.deleteStoredImages(keys),
      );
    },
    async renameStoredImage(input) {
      return storedImageRenameResultSchema.parse(
        await adapter.renameStoredImage(input),
      );
    },
    async downloadStoredImage(key) {
      return storedImageDownloadResultSchema.parse(
        await adapter.downloadStoredImage(key),
      );
    },
    async probeStoredImage(key) {
      return storedImageMetadataResultSchema.parse(
        await adapter.probeStoredImage(key),
      );
    },
    async checkAccess(input) {
      return imageStorageAccessResultSchema.parse(
        await adapter.checkAccess(input),
      );
    },
  };
}
