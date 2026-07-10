import type {
  CheckStorageAccessInput,
  CreateImageStorageFromSettings,
  ImageStorage,
  PutStoredImageInput,
  RenameStoredImageInput,
} from "@/modules/image-storage";
import { createMemoryImageStorageAdapter } from "@/modules/image-storage/adapters/memory";
import type { S3Options } from "@/stores/schemas/settings";

export function createCountedImageStorage({
  storage = createMemoryImageStorageAdapter(),
  overrides = {},
}: {
  storage?: ImageStorage;
  overrides?: Partial<ImageStorage>;
} = {}) {
  const calls = {
    createStorage: [] as S3Options[],
    listStoredImages: 0,
    putStoredImage: [] as PutStoredImageInput[],
    deleteStoredImages: [] as string[][],
    renameStoredImage: [] as RenameStoredImageInput[],
    downloadStoredImage: [] as string[],
    probeStoredImage: [] as string[],
    checkAccess: [] as CheckStorageAccessInput[],
  };

  const countedStorage: ImageStorage = {
    async listStoredImages() {
      calls.listStoredImages++;
      return overrides.listStoredImages
        ? overrides.listStoredImages()
        : storage.listStoredImages();
    },
    async putStoredImage(input) {
      calls.putStoredImage.push(input);
      return overrides.putStoredImage
        ? overrides.putStoredImage(input)
        : storage.putStoredImage(input);
    },
    async deleteStoredImages(keys) {
      calls.deleteStoredImages.push([...keys]);
      return overrides.deleteStoredImages
        ? overrides.deleteStoredImages(keys)
        : storage.deleteStoredImages(keys);
    },
    async renameStoredImage(input) {
      calls.renameStoredImage.push(input);
      return overrides.renameStoredImage
        ? overrides.renameStoredImage(input)
        : storage.renameStoredImage(input);
    },
    async downloadStoredImage(key) {
      calls.downloadStoredImage.push(key);
      return overrides.downloadStoredImage
        ? overrides.downloadStoredImage(key)
        : storage.downloadStoredImage(key);
    },
    async probeStoredImage(key) {
      calls.probeStoredImage.push(key);
      return overrides.probeStoredImage
        ? overrides.probeStoredImage(key)
        : storage.probeStoredImage(key);
    },
    async checkAccess(input) {
      calls.checkAccess.push(input);
      return overrides.checkAccess
        ? overrides.checkAccess(input)
        : storage.checkAccess(input);
    },
  };

  const createStorage: CreateImageStorageFromSettings = (settings) => {
    calls.createStorage.push(settings);
    return countedStorage;
  };

  return { calls, createStorage, storage: countedStorage };
}
