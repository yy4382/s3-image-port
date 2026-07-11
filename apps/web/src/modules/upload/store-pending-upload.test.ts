import { createStore } from "jotai";
import { describe, expect, it, vi } from "vitest";

import { createImageCatalog } from "@/modules/image-catalog";
import { settings } from "@/stores/atoms/settings";
import { createDeferred, settle } from "@/test/helpers/deterministic";
import { createCountedImageStorage } from "@/test/helpers/image-storage";
import { ControllableStorage } from "@/test/helpers/storage";

import { createStorePendingUpload } from "./store-pending-upload";

const firstTarget = {
  endpoint: "https://s3.example.com",
  bucket: "images",
  region: "us-east-1",
  accKeyId: "access-key",
  secretAccKey: "secret-key",
  forcePathStyle: false,
  pubUrl: "https://cdn.example.com",
  includePath: "gallery/",
};

const alpha = {
  key: "gallery/alpha.webp",
  lastModified: "2026-07-01T10:00:00.000Z",
};

const uploaded = {
  key: "gallery/new.webp",
  lastModified: "2026-07-02T10:00:00.000Z",
};

describe("store pending upload", () => {
  it("does not integrate a PUT completion after its settings become obsolete", async () => {
    const catalog = createImageCatalog();
    const store = createStore();
    store.set(settings.storage, { type: "update", value: firstTarget });
    const put = createDeferred<{ ok: true; value: typeof uploaded }>();
    const uploadStorage = createCountedImageStorage({
      overrides: { putStoredImage: () => put.promise },
    });
    const storePendingUpload = createStorePendingUpload({
      store,
      catalog,
      createStorage: uploadStorage.createStorage,
      onUploadFailed: vi.fn(),
    });
    const file = new File(["image"], "new.webp", { type: "image/webp" });
    const result = storePendingUpload({
      uploadId: "upload-obsolete",
      file,
      body: file,
      key: uploaded.key,
    });
    store.set(settings.storage, {
      type: "update",
      value: { ...firstTarget, secretAccKey: "rotated-secret" },
    });

    put.resolve({ ok: true, value: uploaded });
    await expect(result).resolves.toEqual({
      status: "failed",
      error: { reason: "superseded" },
    });
    expect(store.get(catalog.state).projection.images).not.toContainEqual(
      uploaded,
    );
    expect(uploadStorage.calls.putStoredImage).toHaveLength(1);
  });

  it("reads the current validated settings when the PUT begins", async () => {
    const catalogStorage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => ({ ok: true, value: [uploaded] }),
      },
    });
    const catalog = createImageCatalog({
      createStorage: catalogStorage.createStorage,
    });
    const store = createStore();
    store.set(settings.storage, { type: "update", value: firstTarget });
    const uploadStorage = createCountedImageStorage({
      overrides: {
        putStoredImage: async () => ({ ok: true, value: uploaded }),
      },
    });
    const storePendingUpload = createStorePendingUpload({
      store,
      catalog,
      createStorage: uploadStorage.createStorage,
      onUploadFailed: vi.fn(),
    });
    const currentTarget = { ...firstTarget, region: "eu-west-1" };
    store.set(settings.storage, { type: "update", value: currentTarget });
    const set = vi.spyOn(store, "set");
    const file = new File(["image"], "new.webp", { type: "image/webp" });

    await expect(
      storePendingUpload({
        uploadId: "upload-current-settings",
        file,
        body: file,
        key: uploaded.key,
      }),
    ).resolves.toEqual({ status: "stored", image: uploaded });
    expect(uploadStorage.calls.createStorage).toEqual([currentTarget]);
    expect(uploadStorage.calls.putStoredImage).toHaveLength(1);
    expect(
      set.mock.calls.filter(([target]) => target === catalog.integrate),
    ).toHaveLength(1);
  });

  it("reports invalid settings before target mismatch without constructing storage", async () => {
    const catalogStorage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => ({ ok: true, value: [alpha] }),
      },
    });
    const catalog = createImageCatalog({
      createStorage: catalogStorage.createStorage,
    });
    const store = createStore();
    store.set(settings.storage, { type: "update", value: firstTarget });
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    store.set(settings.storage, {
      type: "update",
      value: { ...firstTarget, endpoint: "" },
    });
    const uploadStorage = createCountedImageStorage();
    const storePendingUpload = createStorePendingUpload({
      store,
      catalog,
      createStorage: uploadStorage.createStorage,
      onUploadFailed: vi.fn(),
    });
    const file = new File(["image"], "new.webp", { type: "image/webp" });

    await expect(
      storePendingUpload({
        uploadId: "upload-invalid",
        file,
        body: file,
        key: uploaded.key,
      }),
    ).resolves.toEqual({
      status: "failed",
      error: { reason: "not-configured" },
    });
    expect(uploadStorage.calls.createStorage).toHaveLength(0);
  });

  it("does not PUT while the catalog belongs to another target", async () => {
    const catalogStorage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => ({ ok: true, value: [alpha] }),
      },
    });
    const catalog = createImageCatalog({
      createStorage: catalogStorage.createStorage,
    });
    const store = createStore();
    store.set(settings.storage, { type: "update", value: firstTarget });
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    store.set(settings.storage, {
      type: "update",
      value: { ...firstTarget, bucket: "other-images" },
    });
    const uploadStorage = createCountedImageStorage();
    const onUploadFailed = vi.fn();
    const storePendingUpload = createStorePendingUpload({
      store,
      catalog,
      createStorage: uploadStorage.createStorage,
      onUploadFailed,
    });
    const file = new File(["image"], "new.webp", { type: "image/webp" });

    await expect(
      storePendingUpload({
        uploadId: "upload-1",
        file,
        body: file,
        key: "gallery/new.webp",
      }),
    ).resolves.toEqual({
      status: "failed",
      error: { reason: "target-mismatch" },
    });
    expect(uploadStorage.calls.createStorage).toHaveLength(0);
    expect(uploadStorage.calls.putStoredImage).toHaveLength(0);
    expect(onUploadFailed).not.toHaveBeenCalled();
  });

  it.each(["listing-first", "put-first"] as const)(
    "reconciles a current upload when an unloaded catalog settles %s",
    async (order) => {
      const listing = createDeferred<
        | { ok: true; value: (typeof alpha)[] }
        | { ok: false; error: { reason: "unknown"; message: string } }
      >();
      const put = createDeferred<{ ok: true; value: typeof uploaded }>();
      let listCalls = 0;
      const catalogStorage = createCountedImageStorage({
        overrides: {
          listStoredImages: () => {
            listCalls++;
            return listCalls === 1
              ? listing.promise
              : Promise.resolve({ ok: true, value: [alpha, uploaded] });
          },
        },
      });
      const catalog = createImageCatalog({
        cacheStorage: new ControllableStorage(),
        createStorage: catalogStorage.createStorage,
      });
      const store = createStore();
      const unsubscribe = store.sub(catalog.state, () => {});
      store.set(settings.storage, { type: "update", value: firstTarget });
      expect(store.get(catalog.state).projection).toMatchObject({
        kind: "unloaded",
        usable: false,
      });
      const refresh = store.set(catalog.run, {
        type: "refresh",
        intent: "background",
        reason: "startup",
      });
      const uploadStorage = createCountedImageStorage({
        overrides: { putStoredImage: () => put.promise },
      });
      const storePendingUpload = createStorePendingUpload({
        store,
        catalog,
        createStorage: uploadStorage.createStorage,
        onUploadFailed: vi.fn(),
      });
      const file = new File(["image"], "new.webp", { type: "image/webp" });
      const result = storePendingUpload({
        uploadId: `upload-${order}`,
        file,
        body: file,
        key: uploaded.key,
      });
      expect(uploadStorage.calls.putStoredImage).toHaveLength(1);

      if (order === "listing-first") {
        listing.resolve({ ok: true, value: [alpha] });
        await refresh;
        put.resolve({ ok: true, value: uploaded });
        await expect(result).resolves.toEqual({
          status: "stored",
          image: uploaded,
        });
      } else {
        put.resolve({ ok: true, value: uploaded });
        await expect(result).resolves.toEqual({
          status: "stored",
          image: uploaded,
        });
        expect(store.get(catalog.state).projection.images).toEqual([uploaded]);
        expect(listing.settled).toBe(false);
        listing.resolve({ ok: true, value: [alpha] });
        await refresh;
      }

      await settle();
      expect(uploadStorage.calls.createStorage).toHaveLength(1);
      expect(uploadStorage.calls.putStoredImage).toHaveLength(1);
      expect(catalogStorage.calls.listStoredImages).toBe(
        order === "listing-first" ? 2 : 1,
      );
      expect(store.get(catalog.state).projection.images).toEqual([
        alpha,
        uploaded,
      ]);
      unsubscribe();
    },
  );

  it("blocks a known unbound cache until refresh succeeds and requires an explicit upload retry", async () => {
    const firstListing = createDeferred<{
      ok: false;
      error: { reason: "unknown"; message: string };
    }>();
    const secondListing = createDeferred<{
      ok: true;
      value: (typeof alpha)[];
    }>();
    let listCalls = 0;
    const catalogStorage = createCountedImageStorage({
      overrides: {
        listStoredImages: () => {
          listCalls++;
          if (listCalls === 1) return firstListing.promise;
          if (listCalls === 2) return secondListing.promise;
          return Promise.resolve({
            ok: true as const,
            value: [alpha, uploaded],
          });
        },
      },
    });
    const catalog = createImageCatalog({
      cacheStorage: new ControllableStorage({
        "s3ip:gallery:photos": JSON.stringify([alpha]),
      }),
      createStorage: catalogStorage.createStorage,
    });
    const store = createStore();
    const unsubscribe = store.sub(catalog.state, () => {});
    store.set(settings.storage, { type: "update", value: firstTarget });
    const uploadStorage = createCountedImageStorage({
      overrides: {
        putStoredImage: async () => ({ ok: true, value: uploaded }),
      },
    });
    const storePendingUpload = createStorePendingUpload({
      store,
      catalog,
      createStorage: uploadStorage.createStorage,
      onUploadFailed: vi.fn(),
    });
    const file = new File(["image"], "new.webp", { type: "image/webp" });
    const upload = (uploadId: string) =>
      storePendingUpload({
        uploadId,
        file,
        body: file,
        key: uploaded.key,
      });

    const failedRefresh = store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    await expect(upload("while-refreshing")).resolves.toEqual({
      status: "failed",
      error: { reason: "target-mismatch" },
    });
    expect(uploadStorage.calls.createStorage).toHaveLength(0);
    expect(uploadStorage.calls.putStoredImage).toHaveLength(0);

    firstListing.resolve({
      ok: false,
      error: { reason: "unknown", message: "offline" },
    });
    await failedRefresh;
    await expect(upload("after-failure")).resolves.toEqual({
      status: "failed",
      error: { reason: "target-mismatch" },
    });
    expect(uploadStorage.calls.createStorage).toHaveLength(0);
    expect(uploadStorage.calls.putStoredImage).toHaveLength(0);

    const successfulRefresh = store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    await expect(upload("before-success")).resolves.toEqual({
      status: "failed",
      error: { reason: "target-mismatch" },
    });
    expect(uploadStorage.calls.putStoredImage).toHaveLength(0);
    secondListing.resolve({ ok: true, value: [alpha] });
    await successfulRefresh;

    await expect(upload("explicit-retry")).resolves.toEqual({
      status: "stored",
      image: uploaded,
    });
    expect(uploadStorage.calls.createStorage).toHaveLength(1);
    expect(uploadStorage.calls.putStoredImage).toHaveLength(1);
    await settle();
    expect(catalogStorage.calls.listStoredImages).toBe(3);
    expect(store.get(catalog.state).projection.images).toEqual([
      alpha,
      uploaded,
    ]);
    unsubscribe();
  });

  it("reports a current remote success as stored when catalog reconciliation fails", async () => {
    const listing = createDeferred<{
      ok: false;
      error: { reason: "unknown"; message: string };
    }>();
    const catalogStorage = createCountedImageStorage({
      overrides: { listStoredImages: () => listing.promise },
    });
    const catalog = createImageCatalog({
      cacheStorage: new ControllableStorage(),
      createStorage: catalogStorage.createStorage,
    });
    const store = createStore();
    const unsubscribe = store.sub(catalog.state, () => {});
    store.set(settings.storage, { type: "update", value: firstTarget });
    const refresh = store.set(catalog.run, {
      type: "refresh",
      intent: "background",
      reason: "startup",
    });
    const uploadStorage = createCountedImageStorage({
      overrides: {
        putStoredImage: async () => ({ ok: true, value: uploaded }),
      },
    });
    const onUploadFailed = vi.fn();
    const storePendingUpload = createStorePendingUpload({
      store,
      catalog,
      createStorage: uploadStorage.createStorage,
      onUploadFailed,
    });
    const file = new File(["image"], "new.webp", { type: "image/webp" });
    const result = storePendingUpload({
      uploadId: "upload-stored",
      file,
      body: file,
      key: uploaded.key,
    });

    await expect(result).resolves.toEqual({
      status: "stored",
      image: uploaded,
    });
    expect(store.get(catalog.state).projection.images).toEqual([uploaded]);
    expect(listing.settled).toBe(false);
    listing.resolve({
      ok: false,
      error: { reason: "unknown", message: "offline" },
    });
    await refresh;
    await settle();
    expect(store.get(catalog.state).projection.images).toEqual([uploaded]);
    expect(catalogStorage.calls.listStoredImages).toBe(1);
    expect(uploadStorage.calls.putStoredImage).toHaveLength(1);
    expect(onUploadFailed).not.toHaveBeenCalled();
    unsubscribe();
  });
});
