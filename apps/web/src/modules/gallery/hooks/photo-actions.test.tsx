import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "vitest-browser-react";
import { Provider, useAtomValue } from "jotai";
import { createStore } from "jotai";
import type { ReactNode } from "react";

import {
  type ImageStorage,
  type ImageStorageFailure,
  type StoredImage,
} from "@/modules/image-storage";
import { createMemoryImageStorageAdapter } from "@/modules/image-storage/adapters/memory";
import {
  photosAtom,
  selectedPhotosAtom,
} from "@/stores/atoms/gallery";
import { profilesAtom } from "@/stores/atoms/settings";
import { getDefaultOptions, type S3Options } from "@/stores/schemas/settings";
import { useDeletePhotos } from "./use-delete";
import { useDownloadPhoto } from "./use-download";
import { useRenamePhoto } from "./use-rename";

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  message: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const validS3Settings: S3Options = {
  endpoint: "https://s3.example.com",
  bucket: "images",
  region: "us-east-1",
  accKeyId: "access-key",
  secretAccKey: "secret-key",
  forcePathStyle: false,
  pubUrl: "https://cdn.example.com",
  includePath: "",
};

const sourceImage: StoredImage = {
  key: "i/source.webp",
  lastModified: "2026-07-06T10:00:00.000Z",
};

const targetImage: StoredImage = {
  key: "i/target.webp",
  lastModified: "2026-07-06T11:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("stored image gallery actions", () => {
  it("deletes stored images through image storage and refreshes gallery state", async () => {
    const storage = createMemoryStorage([sourceImage, targetImage]);
    const store = createConfiguredStore({
      photos: [sourceImage, targetImage],
      selected: [sourceImage.key, targetImage.key],
    });

    const { result, act } = await renderHook(
      () => ({
        deletePhotos: useDeletePhotos(() => storage),
        photos: useAtomValue(photosAtom),
        selected: useAtomValue(selectedPhotosAtom),
      }),
      { wrapper: wrapperForStore(store) },
    );

    let deleteResult: Awaited<ReturnType<(typeof result.current)["deletePhotos"]>>;
    await act(async () => {
      deleteResult = await result.current.deletePhotos(sourceImage.key);
    });

    expect(deleteResult!).toEqual({ success: true });
    expect(result.current.photos.map((image) => image.key)).toEqual([
      targetImage.key,
    ]);
    expect([...result.current.selected]).toEqual([targetImage.key]);
  });

  it("returns typed delete failures and still cleans selection and refreshes", async () => {
    const storage = createFailingStorage({
      deleteFailure: { reason: "access-denied" },
      images: [sourceImage],
    });
    const store = createConfiguredStore({
      photos: [sourceImage],
      selected: [sourceImage.key],
    });

    const { result, act } = await renderHook(
      () => ({
        deletePhotos: useDeletePhotos(() => storage),
        photos: useAtomValue(photosAtom),
        selected: useAtomValue(selectedPhotosAtom),
      }),
      { wrapper: wrapperForStore(store) },
    );

    let deleteResult: Awaited<ReturnType<(typeof result.current)["deletePhotos"]>>;
    await act(async () => {
      deleteResult = await result.current.deletePhotos(sourceImage.key);
    });

    expect(deleteResult!).toEqual({
      success: false,
      error: "access-denied",
    });
    expect(result.current.photos).toEqual([sourceImage]);
    expect([...result.current.selected]).toEqual([]);
  });

  it("renames stored images through image storage and updates selection after refresh", async () => {
    const storage = createMemoryStorage([sourceImage]);
    const store = createConfiguredStore({
      photos: [sourceImage],
      selected: [sourceImage.key],
    });

    const { result, act } = await renderHook(
      () => ({
        renamePhoto: useRenamePhoto(() => storage),
        photos: useAtomValue(photosAtom),
        selected: useAtomValue(selectedPhotosAtom),
      }),
      { wrapper: wrapperForStore(store) },
    );

    let renameResult: Awaited<ReturnType<(typeof result.current)["renamePhoto"]>>;
    await act(async () => {
      renameResult = await result.current.renamePhoto(
        sourceImage.key,
        "i/renamed.webp",
      );
    });

    expect(renameResult!).toEqual({ success: true });
    expect(result.current.photos.map((image) => image.key)).toEqual([
      "i/renamed.webp",
    ]);
    expect([...result.current.selected]).toEqual(["i/renamed.webp"]);
  });

  it("distinguishes invalid, same-key, already-exists, partial-rename, and unknown rename outcomes", async () => {
    const store = createConfiguredStore({ photos: [sourceImage] });
    const alreadyExistsStorage = createMemoryStorage([sourceImage, targetImage]);
    const partialStorage = createFailingStorage({
      renameFailure: {
        reason: "partial-rename",
        copiedKey: "i/copied.webp",
        failedDeleteKey: sourceImage.key,
      },
    });
    const unknownStorage = createFailingStorage({
      renameFailure: { reason: "unknown", message: "rename failed" },
    });

    const { result, act, rerender } = await renderHook(
      ({ storage }: { storage?: ImageStorage } = {}) =>
        useRenamePhoto(() => storage ?? alreadyExistsStorage),
      {
        wrapper: wrapperForStore(store),
        initialProps: { storage: alreadyExistsStorage },
      },
    );

    let renameResult: Awaited<ReturnType<typeof result.current>>;
    await act(async () => {
      renameResult = await result.current(sourceImage.key, "   ");
    });
    expect(renameResult!).toEqual({ success: false, error: "invalidKey" });

    await act(async () => {
      renameResult = await result.current(sourceImage.key, sourceImage.key);
    });
    expect(renameResult!).toEqual({ success: false, error: "sameKey" });

    await act(async () => {
      renameResult = await result.current(sourceImage.key, targetImage.key);
    });
    expect(renameResult!).toEqual({
      success: false,
      error: "already-exists",
    });

    rerender({ storage: partialStorage });
    await act(async () => {
      renameResult = await result.current(sourceImage.key, "i/copied.webp");
    });
    expect(renameResult!).toEqual({
      success: false,
      error: "partial-rename",
    });

    rerender({ storage: unknownStorage });
    await act(async () => {
      renameResult = await result.current(sourceImage.key, "i/unknown.webp");
    });
    expect(renameResult!).toEqual({ success: false, error: "unknown" });
  });

  it("passes explicit overwrite intent to storage rename", async () => {
    const storage = createMemoryStorage([sourceImage, targetImage]);
    const store = createConfiguredStore({ photos: [sourceImage, targetImage] });

    const { result, act } = await renderHook(
      () => useRenamePhoto(() => storage),
      { wrapper: wrapperForStore(store) },
    );

    let renameResult: Awaited<ReturnType<typeof result.current>>;
    await act(async () => {
      renameResult = await result.current(
        sourceImage.key,
        targetImage.key,
        true,
      );
    });

    expect(renameResult!).toEqual({ success: true });
  });

  it("downloads browser-usable stored image data from image storage", async () => {
    const storage = createMemoryImageStorageAdapter({
      images: [sourceImage],
      bodies: {
        [sourceImage.key]: new Blob(["image bytes"], { type: "image/webp" }),
      },
    });
    const store = createConfiguredStore();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:stored-image");
    const revokeObjectUrlSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});

    const { result, act } = await renderHook(
      () => useDownloadPhoto(() => storage),
      { wrapper: wrapperForStore(store) },
    );

    let downloadResult: Awaited<ReturnType<typeof result.current>>;
    await act(async () => {
      downloadResult = await result.current(sourceImage.key);
    });

    expect(downloadResult!).toEqual({ success: true });
    expect(createObjectUrlSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:stored-image");
  });

  it("returns typed download failures from image storage", async () => {
    const notFoundStorage = createFailingStorage({
      downloadFailure: { reason: "not-found", key: sourceImage.key },
    });
    const accessDeniedStorage = createFailingStorage({
      downloadFailure: { reason: "access-denied" },
    });
    const unknownStorage = createFailingStorage({
      downloadFailure: { reason: "unknown", message: "download failed" },
    });
    const store = createConfiguredStore();

    const { result, act, rerender } = await renderHook(
      ({ storage }: { storage?: ImageStorage } = {}) =>
        useDownloadPhoto(() => storage ?? notFoundStorage),
      {
        wrapper: wrapperForStore(store),
        initialProps: { storage: notFoundStorage },
      },
    );

    let downloadResult: Awaited<ReturnType<typeof result.current>>;
    await act(async () => {
      downloadResult = await result.current(sourceImage.key);
    });

    expect(downloadResult!).toEqual({
      success: false,
      error: "not-found",
    });

    rerender({ storage: accessDeniedStorage });
    await act(async () => {
      downloadResult = await result.current(sourceImage.key);
    });
    expect(downloadResult!).toEqual({
      success: false,
      error: "access-denied",
    });

    rerender({ storage: unknownStorage });
    await act(async () => {
      downloadResult = await result.current(sourceImage.key);
    });
    expect(downloadResult!).toEqual({
      success: false,
      error: "unknown",
    });
  });
});

function createMemoryStorage(images: readonly StoredImage[] = []) {
  return createMemoryImageStorageAdapter({
    images,
  });
}

function createConfiguredStore({
  photos = [],
  selected = [],
}: {
  photos?: StoredImage[];
  selected?: string[];
} = {}) {
  const store = createStore();
  store.set(profilesAtom, {
    list: [
      [
        "Test",
        {
          ...getDefaultOptions(),
          s3: validS3Settings,
        },
      ],
    ],
    current: 0,
  });
  store.set(photosAtom, photos);
  store.set(selectedPhotosAtom, new Set(selected));
  return store;
}

function wrapperForStore(store: ReturnType<typeof createStore>) {
  return function TestProvider({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

function createFailingStorage({
  images = [],
  deleteFailure,
  renameFailure,
  downloadFailure,
}: {
  images?: readonly StoredImage[];
  deleteFailure?: ImageStorageFailure;
  renameFailure?: ImageStorageFailure;
  downloadFailure?: ImageStorageFailure;
} = {}): ImageStorage {
  const storage = createMemoryStorage(images);
  return {
    ...storage,
    async deleteStoredImages() {
      if (deleteFailure) {
        return { ok: false, error: deleteFailure };
      }
      return storage.deleteStoredImages([]);
    },
    async renameStoredImage() {
      if (renameFailure) {
        return { ok: false, error: renameFailure };
      }
      return storage.renameStoredImage({
        oldKey: sourceImage.key,
        newKey: targetImage.key,
      });
    },
    async downloadStoredImage() {
      if (downloadFailure) {
        return { ok: false, error: downloadFailure };
      }
      return storage.downloadStoredImage(sourceImage.key);
    },
  };
}
