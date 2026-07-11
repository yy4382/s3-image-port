import { createStore } from "jotai";
import { selectAtom } from "jotai/utils";
import { describe, expect, it } from "vitest";

import { createDeferred, settle } from "@/test/helpers/deterministic";
import { createCountedImageStorage } from "@/test/helpers/image-storage";
import { ControllableStorage } from "@/test/helpers/storage";
import { settings } from "@/stores/atoms/settings";
import { profileGenerationAtom } from "@/modules/settings/profile-generation";

import { createImageCatalog } from ".";

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

const secondTarget = {
  ...firstTarget,
  bucket: "other-images",
  pubUrl: "https://other-cdn.example.com",
};

const alpha = {
  key: "i/alpha.webp",
  lastModified: "2026-07-01T10:00:00.000Z",
};
const beta = {
  key: "i/beta.webp",
  lastModified: "2026-07-02T10:00:00.000Z",
};
const gamma = {
  key: "i/gamma.webp",
  lastModified: "2026-07-03T10:00:00.000Z",
};

describe("deep image catalog", () => {
  it("presents only the five behavior-rich interactions", () => {
    const catalog = createImageCatalog();
    const store = createStore();

    expect(Object.keys(catalog)).toEqual([
      "state",
      "view",
      "item",
      "run",
      "integrate",
    ]);
    expect(Object.keys(catalog.view)).toEqual([
      "filter",
      "page",
      "pageSize",
      "selection",
    ]);
    expect(store.get(catalog.integrate)).toBeNull();
    expect(Object.keys(store.get(catalog.state).projection)).toEqual([
      "kind",
      "images",
      "usable",
      "stale",
      "cacheDiagnostic",
    ]);
    expect(Object.keys(store.get(catalog.item("i/example.webp")))).toEqual([
      "selected",
      "reserved",
      "source",
      "motionSource",
      "access",
    ]);
  });

  it("presents a Live Photo as one catalog item and deletes both components", async () => {
    const still = { key: "i/IMG_0001.heic" };
    const motion = { key: "i/IMG_0001.mov" };
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => ({ ok: true, value: [still, motion] }),
        deleteStoredImages: async (keys) => ({
          ok: true,
          value: { deletedKeys: [...keys] },
        }),
      },
    });
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const store = configuredStore();

    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });

    expect(store.get(catalog.state).gallery.currentPageImages).toEqual([still]);
    expect(store.get(catalog.item(still.key)).motionSource).toBe(
      "https://cdn.example.com/i/IMG_0001.mov",
    );

    await store.set(catalog.run, { type: "delete", keys: [still.key] });
    expect(storage.calls.deleteStoredImages).toEqual([[still.key, motion.key]]);
  });

  it("classifies the bare cache and records malformed cache without IO", () => {
    const cache = new ControllableStorage({
      "s3ip:gallery:photos": "not json",
    });
    const storage = createCountedImageStorage();
    const catalog = createImageCatalog({
      cacheStorage: cache,
      createStorage: storage.createStorage,
    });
    const store = createStore();
    const unsubscribe = store.sub(catalog.state, () => {});

    expect(store.get(catalog.state).projection).toMatchObject({
      kind: "unloaded",
      images: [],
      cacheDiagnostic: { operation: "load" },
    });
    expect(storage.calls.createStorage).toHaveLength(0);
    expect(storage.calls.listStoredImages).toBe(0);

    unsubscribe();
  });

  it("distinguishes cached empty and preserves prefix/filter/sort/page derivations", () => {
    const emptyCatalog = createImageCatalog({
      cacheStorage: new ControllableStorage({
        "s3ip:gallery:photos": "[]",
      }),
    });
    const emptyStore = configuredStore();
    const stopEmpty = emptyStore.sub(emptyCatalog.state, () => {});
    emptyStore.set(settings.storage, { type: "update", value: firstTarget });
    expect(emptyStore.get(emptyCatalog.state).projection).toMatchObject({
      kind: "empty",
      images: [],
      usable: false,
    });
    expect(emptyStore.get(emptyCatalog.state).backgroundRefreshEligible).toBe(
      true,
    );
    stopEmpty();

    const images = [
      {
        key: "i/2026/january/alpha.webp",
        lastModified: "2026-01-05T10:00:00.000Z",
      },
      {
        key: "i/2026/january/cat.webp",
        lastModified: "2026-01-03T10:00:00.000Z",
      },
      {
        key: "i/2026/february/beta.webp",
        lastModified: "2026-02-05T10:00:00.000Z",
      },
      ...Array.from({ length: 18 }, (_, index) => ({
        key: `root-${String(index).padStart(2, "0")}.webp`,
        lastModified: "2026-01-01T10:00:00.000Z",
      })),
    ];
    const catalog = createImageCatalog({
      cacheStorage: new ControllableStorage({
        "s3ip:gallery:photos": JSON.stringify(images),
      }),
    });
    const store = createStore();
    const unsubscribe = store.sub(catalog.state, () => {});
    store.set(settings.storage, { type: "update", value: firstTarget });

    expect(store.get(catalog.state).gallery.availablePrefixes).toEqual([
      { name: "", hierarchy: 0 },
      { name: "i", hierarchy: 0 },
      { name: "i/2026", hierarchy: 1 },
      { name: "i/2026/february", hierarchy: 2 },
      { name: "i/2026/january", hierarchy: 2 },
    ]);
    store.set(catalog.view.filter, {
      searchTerm: "cat",
      prefix: "i/2026/january",
      dateRangeType: [
        new Date("2026-01-01T00:00:00.000Z"),
        new Date("2026-01-31T23:59:59.999Z"),
      ],
      sortBy: "date",
      sortOrder: "asc",
    });
    expect(
      store.get(catalog.state).gallery.filteredImages.map((image) => image.key),
    ).toEqual(["i/2026/january/cat.webp"]);

    store.set(catalog.view.filter, {
      searchTerm: "",
      prefix: undefined,
      dateRangeType: [null, null],
      sortBy: "key",
      sortOrder: "asc",
    });
    store.set(catalog.view.page, 2);
    expect(store.get(catalog.state).gallery.currentPageImages).toHaveLength(1);
    unsubscribe();
  });

  it.each([
    { name: "cached-empty", images: [] },
    { name: "ready", images: [alpha] },
  ])(
    "keeps a $name cache target-unsafe when it hydrated before settings",
    async ({ images }) => {
      const cache = new ControllableStorage({
        "s3ip:gallery:photos": JSON.stringify(images),
      });
      const storage = createCountedImageStorage({
        overrides: {
          listStoredImages: async () => ({ ok: true, value: images }),
        },
      });
      const catalog = createImageCatalog({
        cacheStorage: cache,
        createStorage: storage.createStorage,
      });
      const store = createStore();
      const unsubscribe = store.sub(catalog.state, () => {});

      store.set(settings.storage, { type: "update", value: firstTarget });
      expect(store.get(catalog.state).projection.usable).toBe(false);
      expect(store.get(catalog.state).backgroundRefreshEligible).toBe(true);
      expect(store.get(catalog.item(alpha.key)).access).toBeUndefined();

      const commands = [
        { type: "access", key: alpha.key, purpose: "probe" },
        { type: "access", key: alpha.key, purpose: "download" },
        { type: "access", key: alpha.key, purpose: "url" },
        { type: "access", key: alpha.key, purpose: "markdown" },
        { type: "delete", keys: [alpha.key] as string[] },
        {
          type: "rename",
          oldKey: alpha.key,
          newKey: "i/renamed.webp",
        },
      ] as const;
      for (const command of commands) {
        await expect(store.set(catalog.run, command)).resolves.toEqual({
          status: "target-mismatch",
        });
      }
      expect(
        store.set(catalog.integrate, {
          type: "upload-confirmed",
          uploadId: "unknown-target-upload",
          image: beta,
          ...acceptance(store),
        }),
      ).toEqual({ status: "accepted", image: beta });
      expect(store.get(catalog.state).projection).toMatchObject({
        images: [...images, beta],
        usable: false,
      });
      expect(storage.calls.createStorage).toHaveLength(0);
      expect(cache.setCalls).toHaveLength(1);

      await expect(
        store.set(catalog.run, {
          type: "refresh",
          intent: "foreground",
          reason: "manual",
        }),
      ).resolves.toMatchObject({ status: "refreshed" });
      expect(store.get(catalog.state).projection.usable).toBe(true);
      expect(storage.calls.createStorage).toHaveLength(1);
      expect(storage.calls.listStoredImages).toBe(1);
      unsubscribe();
    },
  );

  it("keeps a ready bare cache unbound when settings are ready before hydration", () => {
    const catalog = createImageCatalog({
      cacheStorage: new ControllableStorage({
        "s3ip:gallery:photos": JSON.stringify([alpha]),
      }),
    });
    const store = createStore();
    const unsubscribeSettings = store.sub(settings.storage, () => {});
    store.set(settings.storage, { type: "update", value: firstTarget });
    const unsubscribe = store.sub(catalog.state, () => {});

    expect(store.get(catalog.state).projection).toMatchObject({
      kind: "ready",
      images: [alpha],
      usable: false,
    });
    expect(store.get(catalog.state).backgroundRefreshEligible).toBe(true);
    expect(
      store.set(catalog.integrate, {
        type: "upload-confirmed",
        uploadId: "settings-first-upload",
        image: beta,
        ...acceptance(store),
      }),
    ).toEqual({ status: "accepted", image: beta });
    expect(store.get(catalog.state).projection).toMatchObject({
      images: [alpha, beta],
      usable: false,
    });
    unsubscribe();
    unsubscribeSettings();
  });

  it("joins refreshes and upgrades background intent with one adapter/list", async () => {
    const listing = createDeferred<{
      ok: true;
      value: (typeof alpha)[];
    }>();
    const storage = createCountedImageStorage({
      overrides: { listStoredImages: () => listing.promise },
    });
    const cache = new ControllableStorage();
    const catalog = createImageCatalog({
      cacheStorage: cache,
      createStorage: storage.createStorage,
    });
    const store = configuredStore();

    const background = store.set(catalog.run, {
      type: "refresh",
      intent: "background",
      reason: "startup",
    });
    const foreground = store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });

    expect(foreground).toBe(background);
    expect(store.get(catalog.state).refresh).toMatchObject({
      status: "refreshing",
      intent: "foreground",
    });
    expect(storage.calls.createStorage).toHaveLength(1);
    expect(storage.calls.listStoredImages).toBe(1);

    listing.resolve({ ok: true, value: [alpha] });
    await expect(background).resolves.toMatchObject({ status: "refreshed" });
    expect(store.get(catalog.state).projection).toMatchObject({
      kind: "ready",
      images: [alpha],
      usable: true,
      stale: false,
    });
    expect(store.get(catalog.state).backgroundRefreshEligible).toBe(false);
    expect(cache.setCalls).toHaveLength(1);
  });

  it("queues one current-context refresh behind an unsuitable active refresh", async () => {
    const obsoleteListing = createDeferred<{
      ok: true;
      value: (typeof alpha)[];
    }>();
    let lists = 0;
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: () => {
          lists++;
          if (lists === 1) return Promise.resolve({ ok: true, value: [alpha] });
          if (lists === 2) return obsoleteListing.promise;
          return Promise.resolve({ ok: true, value: [beta] });
        },
      },
    });
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const store = configuredStore();
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });

    const obsolete = store.set(catalog.run, {
      type: "refresh",
      intent: "background",
      reason: "startup",
    });
    store.set(settings.storage, {
      type: "update",
      value: { ...firstTarget, region: "eu-west-1" },
    });
    const current = store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });

    expect(current).not.toBe(obsolete);
    expect(storage.calls.listStoredImages).toBe(2);
    obsoleteListing.resolve({ ok: true, value: [alpha] });
    await expect(obsolete).resolves.toEqual({ status: "superseded" });
    await expect(current).resolves.toMatchObject({
      status: "refreshed",
      images: [beta],
    });
    expect(storage.calls.listStoredImages).toBe(3);
    expect(store.get(catalog.state).projection).toMatchObject({
      images: [beta],
      stale: false,
    });
  });

  it("reconciles a current confirmed fact after an obsolete active refresh", async () => {
    const obsoleteListing = createDeferred<{
      ok: true;
      value: (typeof alpha)[];
    }>();
    let lists = 0;
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: () => {
          lists++;
          if (lists === 1) return Promise.resolve({ ok: true, value: [alpha] });
          if (lists === 2) return obsoleteListing.promise;
          return Promise.resolve({ ok: true, value: [alpha, beta] });
        },
      },
    });
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const store = configuredStore();
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });

    const obsolete = store.set(catalog.run, {
      type: "refresh",
      intent: "background",
      reason: "startup",
    });
    store.set(settings.storage, {
      type: "update",
      value: { ...firstTarget, region: "eu-west-1" },
    });
    expect(
      store.set(catalog.integrate, {
        type: "upload-confirmed",
        uploadId: "current-upload",
        image: beta,
        ...acceptance(store),
      }),
    ).toMatchObject({ status: "accepted" });

    obsoleteListing.resolve({ ok: true, value: [alpha] });
    await expect(obsolete).resolves.toEqual({ status: "superseded" });
    await settle();
    expect(storage.calls.listStoredImages).toBe(3);
    expect(store.get(catalog.state).projection).toMatchObject({
      images: [alpha, beta],
      stale: false,
    });
  });

  it("keeps exactly one queued reconciliation for the latest revision", async () => {
    const obsoleteListing = createDeferred<{
      ok: true;
      value: (typeof alpha)[];
    }>();
    let lists = 0;
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: () => {
          lists++;
          if (lists === 1) return Promise.resolve({ ok: true, value: [alpha] });
          if (lists === 2) return obsoleteListing.promise;
          return Promise.resolve({ ok: true, value: [alpha, beta, gamma] });
        },
      },
    });
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const store = configuredStore();
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });

    const obsolete = store.set(catalog.run, {
      type: "refresh",
      intent: "background",
      reason: "startup",
    });
    store.set(settings.storage, {
      type: "update",
      value: { ...firstTarget, region: "eu-west-1" },
    });
    expect(
      store.set(catalog.integrate, {
        type: "upload-confirmed",
        uploadId: "revision-two",
        image: beta,
        ...acceptance(store),
      }),
    ).toMatchObject({ status: "accepted" });
    const supersededQueued = store.set(catalog.run, {
      type: "refresh",
      intent: "background",
      reason: "reconciliation",
    });

    store.set(settings.storage, {
      type: "update",
      value: { ...firstTarget, region: "ap-southeast-1" },
    });
    expect(
      store.set(catalog.integrate, {
        type: "upload-confirmed",
        uploadId: "revision-three",
        image: gamma,
        ...acceptance(store),
      }),
    ).toMatchObject({ status: "accepted" });

    obsoleteListing.resolve({ ok: true, value: [alpha] });
    await expect(obsolete).resolves.toEqual({ status: "superseded" });
    await expect(supersededQueued).resolves.toEqual({ status: "superseded" });
    await settle();
    expect(storage.calls.listStoredImages).toBe(3);
    expect(store.get(catalog.state).projection).toMatchObject({
      images: [alpha, beta, gamma],
      stale: false,
    });
    await settle();
    expect(storage.calls.listStoredImages).toBe(3);
  });

  it("deduplicates an upload notification before its single reconciliation without retry", async () => {
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => ({ ok: true, value: [alpha, beta] }),
      },
    });
    const cache = new ControllableStorage();
    const catalog = createImageCatalog({
      cacheStorage: cache,
      createStorage: storage.createStorage,
    });
    const store = configuredStore();
    const unsubscribe = store.sub(catalog.state, () => {});
    const fact = {
      type: "upload-confirmed" as const,
      uploadId: "duplicate-notification",
      image: beta,
      ...acceptance(store),
    };

    expect(store.set(catalog.integrate, fact)).toMatchObject({
      status: "accepted",
    });
    expect(store.set(catalog.integrate, fact)).toEqual({ status: "duplicate" });

    await settle({ microtasks: 10 });
    expect(storage.calls.createStorage).toHaveLength(1);
    expect(storage.calls.listStoredImages).toBe(1);
    expect(store.get(catalog.state).projection.images).toEqual([alpha, beta]);
    const settled = {
      lists: storage.calls.listStoredImages,
      writes: cache.setCalls.length,
    };
    await settle({ microtasks: 10 });
    expect({
      lists: storage.calls.listStoredImages,
      writes: cache.setCalls.length,
    }).toEqual(settled);

    unsubscribe();
  });

  it("retains last-good images and blocks target IO until explicit rebind", async () => {
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => ({ ok: true, value: [alpha] }),
      },
    });
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const store = configuredStore();

    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    const firstSource = store.get(catalog.item(alpha.key)).source;
    expect(firstSource).toBe("https://cdn.example.com/i/alpha.webp");
    store.set(settings.storage, {
      type: "update",
      value: { ...firstTarget, pubUrl: "https://latest-cdn.example.com" },
    });
    const lastGoodSource = store.get(catalog.item(alpha.key)).source;
    expect(lastGoodSource).toBe("https://latest-cdn.example.com/i/alpha.webp");
    store.set(settings.storage, { type: "update", value: secondTarget });

    expect(store.get(catalog.state).projection).toMatchObject({
      usable: false,
      stale: false,
    });
    expect(store.get(catalog.item(alpha.key))).toMatchObject({
      source: lastGoodSource,
      access: undefined,
    });
    const callsBefore = storage.calls.createStorage.length;
    await expect(
      store.set(catalog.run, {
        type: "access",
        key: alpha.key,
        purpose: "probe",
      }),
    ).resolves.toEqual({ status: "target-mismatch" });
    await expect(
      store.set(catalog.run, {
        type: "access",
        key: alpha.key,
        purpose: "download",
      }),
    ).resolves.toEqual({ status: "target-mismatch" });
    await expect(
      store.set(catalog.run, {
        type: "access",
        key: alpha.key,
        purpose: "url",
      }),
    ).resolves.toEqual({ status: "target-mismatch" });
    await expect(
      store.set(catalog.run, {
        type: "access",
        key: alpha.key,
        purpose: "markdown",
      }),
    ).resolves.toEqual({ status: "target-mismatch" });
    await expect(
      store.set(catalog.run, { type: "delete", keys: [alpha.key] }),
    ).resolves.toEqual({ status: "target-mismatch" });
    await expect(
      store.set(catalog.run, {
        type: "rename",
        oldKey: alpha.key,
        newKey: "i/renamed.webp",
      }),
    ).resolves.toEqual({ status: "target-mismatch" });
    expect(storage.calls.createStorage).toHaveLength(callsBefore);

    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    expect(store.get(catalog.state).projection.usable).toBe(true);
    store.set(settings.storage, {
      type: "update",
      value: {
        ...secondTarget,
        bucket: "third-images",
        pubUrl: "https://third-cdn.example.com",
      },
    });
    expect(store.get(catalog.item(alpha.key))).toMatchObject({
      source: "https://other-cdn.example.com/i/alpha.webp",
      access: undefined,
    });
  });

  it("derives links locally and performs one download through the current context", async () => {
    const body = new Blob(["alpha"], { type: "image/webp" });
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => ({ ok: true, value: [alpha] }),
        downloadStoredImage: async (key) => ({
          ok: true,
          value: { key, body },
        }),
      },
    });
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const store = configuredStore();
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    const adaptersAfterRefresh = storage.calls.createStorage.length;

    await expect(
      store.set(catalog.run, {
        type: "access",
        key: alpha.key,
        purpose: "url",
      }),
    ).resolves.toMatchObject({
      status: "accessed",
      purpose: "url",
      value: expect.stringContaining(alpha.key),
    });
    await expect(
      store.set(catalog.run, {
        type: "access",
        key: alpha.key,
        purpose: "markdown",
      }),
    ).resolves.toMatchObject({
      status: "accessed",
      purpose: "markdown",
      value: expect.stringContaining(alpha.key),
    });
    expect(storage.calls.createStorage).toHaveLength(adaptersAfterRefresh);
    expect(storage.calls.downloadStoredImage).toHaveLength(0);

    await expect(
      store.set(catalog.run, {
        type: "access",
        key: alpha.key,
        purpose: "download",
      }),
    ).resolves.toEqual({
      status: "accessed",
      purpose: "download",
      value: { key: alpha.key, body },
    });
    expect(storage.calls.createStorage).toHaveLength(adaptersAfterRefresh + 1);
    expect(storage.calls.downloadStoredImage).toEqual([alpha.key]);
  });

  it("retains last-good identities and skips cache writes after refresh failure", async () => {
    let lists = 0;
    const cache = new ControllableStorage();
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => {
          lists++;
          return lists === 1
            ? { ok: true as const, value: [alpha] }
            : {
                ok: false as const,
                error: { reason: "unknown" as const, message: "offline" },
              };
        },
      },
    });
    const catalog = createImageCatalog({
      cacheStorage: cache,
      createStorage: storage.createStorage,
    });
    const store = configuredStore();
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    const stateBefore = store.get(catalog.state);
    const cacheWritesBefore = cache.setCalls.length;

    await expect(
      store.set(catalog.run, {
        type: "refresh",
        intent: "foreground",
        reason: "manual",
      }),
    ).resolves.toMatchObject({ status: "refresh-failed" });
    const stateAfter = store.get(catalog.state);
    expect(stateAfter.projection).toBe(stateBefore.projection);
    expect(stateAfter.gallery).toBe(stateBefore.gallery);
    expect(stateAfter.projection.images).toBe(stateBefore.projection.images);
    expect(stateAfter.gallery.availablePrefixes).toBe(
      stateBefore.gallery.availablePrefixes,
    );
    expect(stateAfter.gallery.filteredImages).toBe(
      stateBefore.gallery.filteredImages,
    );
    expect(stateAfter.gallery.currentPageImages).toBe(
      stateBefore.gallery.currentPageImages,
    );
    expect(cache.setCalls).toHaveLength(cacheWritesBefore);
    expect(storage.calls.listStoredImages).toBe(2);
  });

  it("keeps fresh auto-refresh eligibility false across a transient invalid edit", async () => {
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => ({ ok: true, value: [alpha] }),
      },
    });
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const store = createStore();
    const unsubscribe = store.sub(catalog.state, () => {});
    store.set(settings.storage, { type: "update", value: firstTarget });
    expect(store.get(catalog.state).backgroundRefreshEligible).toBe(true);
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    expect(store.get(catalog.state).backgroundRefreshEligible).toBe(false);

    store.set(settings.storage, {
      type: "update",
      value: (current) => ({ ...current, endpoint: "" }),
    });
    expect(store.get(catalog.state).backgroundRefreshEligible).toBe(false);
    store.set(settings.storage, { type: "update", value: firstTarget });
    expect(store.get(catalog.state).backgroundRefreshEligible).toBe(true);
    await store.set(catalog.run, {
      type: "refresh",
      intent: "background",
      reason: "startup",
    });
    expect(store.get(catalog.state).backgroundRefreshEligible).toBe(false);
    expect(storage.calls.listStoredImages).toBe(2);
    unsubscribe();
  });

  it("makes auto-refresh re-enablement eligible after a fresh listing", async () => {
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => ({ ok: true, value: [alpha] }),
      },
    });
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const store = createStore();
    const unsubscribe = store.sub(catalog.state, () => {});
    store.set(settings.storage, { type: "update", value: firstTarget });
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    expect(store.get(catalog.state).backgroundRefreshEligible).toBe(false);

    store.set(settings.gallery, { autoRefresh: false });
    expect(store.get(catalog.state).backgroundRefreshEligible).toBe(false);
    store.set(settings.gallery, { autoRefresh: true });
    expect(store.get(catalog.state).backgroundRefreshEligible).toBe(true);

    await store.set(catalog.run, {
      type: "refresh",
      intent: "background",
      reason: "startup",
    });
    expect(store.get(catalog.state).backgroundRefreshEligible).toBe(false);
    expect(storage.calls.listStoredImages).toBe(2);
    unsubscribe();
  });

  it("clears the previous refresh outcome on profile replacement", async () => {
    const catalog = createImageCatalog({
      createStorage: createCountedImageStorage().createStorage,
    });
    const store = configuredStore();
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    expect(store.get(catalog.state).refresh.lastOutcome).toMatchObject({
      status: "refreshed",
    });

    store.set(settings.gallery, { autoRefresh: false });
    store.set(profileGenerationAtom, (generation) => generation + 1);
    store.set(catalog.integrate, { type: "profile-replaced" });

    expect(store.get(catalog.state).refresh).toEqual({
      status: "idle",
      lastOutcome: undefined,
    });
  });

  it("rejects stale upload facts without projection, cache, or list work", async () => {
    const cache = new ControllableStorage();
    const storage = createCountedImageStorage();
    const catalog = createImageCatalog({
      cacheStorage: cache,
      createStorage: storage.createStorage,
    });
    const store = configuredStore();
    const staleRevision = acceptance(store);
    store.set(settings.storage, {
      type: "update",
      value: { ...firstTarget, region: "eu-west-1" },
    });
    expect(
      store.set(catalog.integrate, {
        type: "upload-confirmed",
        uploadId: "stale-revision",
        image: alpha,
        ...staleRevision,
      }),
    ).toEqual({ status: "stale" });

    const staleGeneration = acceptance(store);
    store.set(profileGenerationAtom, (generation) => generation + 1);
    expect(
      store.set(catalog.integrate, {
        type: "upload-confirmed",
        uploadId: "stale-generation",
        image: beta,
        ...staleGeneration,
      }),
    ).toEqual({ status: "stale" });
    await settle();

    expect(store.get(catalog.state).projection.images).toEqual([]);
    expect(cache.setCalls).toHaveLength(0);
    expect(storage.calls.createStorage).toHaveLength(0);
    expect(storage.calls.listStoredImages).toBe(0);
  });

  it("rejects a current upload fact while the projection belongs to another known target", async () => {
    const cache = new ControllableStorage();
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => ({ ok: true, value: [alpha] }),
      },
    });
    const catalog = createImageCatalog({
      cacheStorage: cache,
      createStorage: storage.createStorage,
    });
    const store = configuredStore();
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    store.set(settings.storage, { type: "update", value: secondTarget });
    const stateBefore = store.get(catalog.state);
    const cacheWritesBefore = cache.setCalls.length;
    const listsBefore = storage.calls.listStoredImages;

    expect(
      store.set(catalog.integrate, {
        type: "upload-confirmed",
        uploadId: "wrong-known-target",
        image: beta,
        ...acceptance(store),
      }),
    ).toEqual({ status: "target-unsafe" });
    await settle();

    const stateAfter = store.get(catalog.state);
    expect(stateAfter.projection).toBe(stateBefore.projection);
    expect(stateAfter.gallery).toBe(stateBefore.gallery);
    expect(cache.setCalls).toHaveLength(cacheWritesBefore);
    expect(storage.calls.listStoredImages).toBe(listsBefore);
  });

  it("does not publish private bookkeeping for an identical image under a new upload ID", () => {
    const cache = new ControllableStorage();
    const catalog = createImageCatalog({ cacheStorage: cache });
    const store = configuredStore();
    const projection = selectAtom(catalog.state, (state) => state.projection);
    const gallery = selectAtom(catalog.state, (state) => state.gallery);
    let projectionUpdates = 0;
    let galleryUpdates = 0;
    const stopProjection = store.sub(projection, () => projectionUpdates++);
    const stopGallery = store.sub(gallery, () => galleryUpdates++);
    store.set(settings.storage, { type: "update", value: firstTarget });

    expect(
      store.set(catalog.integrate, {
        type: "upload-confirmed",
        uploadId: "first-id",
        image: alpha,
        ...acceptance(store),
      }),
    ).toMatchObject({ status: "accepted" });
    const stateBefore = store.get(catalog.state);
    projectionUpdates = 0;
    galleryUpdates = 0;

    expect(
      store.set(catalog.integrate, {
        type: "upload-confirmed",
        uploadId: "second-id",
        image: { ...alpha },
        ...acceptance(store),
      }),
    ).toMatchObject({ status: "accepted" });

    const stateAfter = store.get(catalog.state);
    expect(stateAfter.projection).toBe(stateBefore.projection);
    expect(stateAfter.gallery).toBe(stateBefore.gallery);
    expect(projectionUpdates).toBe(0);
    expect(galleryUpdates).toBe(0);
    expect(cache.setCalls).toHaveLength(2);

    cache.failWrites();
    const galleryBeforeDiagnostic = stateAfter.gallery;
    expect(
      store.set(catalog.integrate, {
        type: "upload-confirmed",
        uploadId: "third-id",
        image: { ...alpha },
        ...acceptance(store),
      }),
    ).toMatchObject({ status: "accepted" });
    expect(store.get(catalog.state).projection.cacheDiagnostic).toMatchObject({
      operation: "persist",
    });
    expect(store.get(catalog.state).gallery).toBe(galleryBeforeDiagnostic);
    expect(projectionUpdates).toBe(1);
    expect(galleryUpdates).toBe(0);
    expect(cache.setCalls).toHaveLength(3);
    stopProjection();
    stopGallery();
  });

  it("does not let scheduled reconciliation rebind a changed target", async () => {
    const storage = createCountedImageStorage();
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const store = configuredStore();

    expect(
      store.set(catalog.integrate, {
        type: "upload-confirmed",
        uploadId: "before-target-change",
        image: alpha,
        ...acceptance(store),
      }),
    ).toMatchObject({ status: "accepted" });
    store.set(settings.storage, { type: "update", value: secondTarget });
    await settle();

    expect(store.get(catalog.state).projection).toMatchObject({
      images: [alpha],
      usable: false,
      stale: true,
    });
    await expect(
      store.set(catalog.run, {
        type: "access",
        key: alpha.key,
        purpose: "url",
      }),
    ).resolves.toEqual({ status: "target-mismatch" });
    expect(storage.calls.createStorage).toHaveLength(0);
    expect(storage.calls.listStoredImages).toBe(0);
  });

  it("isolates refresh records and cancellation between Jotai stores", async () => {
    const firstListing = createDeferred<{
      ok: true;
      value: (typeof alpha)[];
    }>();
    const secondListing = createDeferred<{
      ok: true;
      value: (typeof beta)[];
    }>();
    let calls = 0;
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: () => {
          calls++;
          return calls === 1 ? firstListing.promise : secondListing.promise;
        },
      },
    });
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const firstStore = configuredStore();
    const secondStore = configuredStore();
    const first = firstStore.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    const second = secondStore.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    expect(first).not.toBe(second);
    expect(storage.calls.listStoredImages).toBe(2);

    firstStore.set(settings.gallery, (gallery) => ({
      ...gallery,
      autoRefresh: false,
    }));
    firstStore.set(profileGenerationAtom, (generation) => generation + 1);
    firstStore.set(catalog.integrate, { type: "profile-replaced" });
    await expect(first).resolves.toEqual({ status: "superseded" });
    secondListing.resolve({ ok: true, value: [beta] });
    await expect(second).resolves.toMatchObject({ status: "refreshed" });
    expect(secondStore.get(catalog.state).projection.images).toEqual([beta]);
    firstListing.resolve({ ok: true, value: [alpha] });
    await settle();
    expect(firstStore.get(catalog.state).projection.images).toEqual([]);
  });

  it.each(["listing-first", "fact-first"] as const)(
    "keeps a confirmed upload across the %s completion order",
    async (order) => {
      const listing = createDeferred<{
        ok: true;
        value: (typeof alpha)[];
      }>();
      let listCall = 0;
      const storage = createCountedImageStorage({
        overrides: {
          listStoredImages: () => {
            listCall++;
            return listCall === 1
              ? listing.promise
              : Promise.resolve({ ok: true, value: [alpha, beta] });
          },
        },
      });
      const cache = new ControllableStorage();
      const catalog = createImageCatalog({
        cacheStorage: cache,
        createStorage: storage.createStorage,
      });
      const store = configuredStore();
      const refresh = store.set(catalog.run, {
        type: "refresh",
        intent: "background",
        reason: "startup",
      });
      const captured = acceptance(store);

      if (order === "listing-first") {
        listing.resolve({ ok: true, value: [alpha] });
        await refresh;
      }
      expect(
        store.set(catalog.integrate, {
          type: "upload-confirmed",
          uploadId: "upload-1",
          image: beta,
          ...captured,
        }),
      ).toMatchObject({ status: "accepted" });
      if (order === "fact-first") {
        listing.resolve({ ok: true, value: [alpha] });
        await refresh;
      }
      await settle();

      expect(
        store.get(catalog.state).projection.images.map((image) => image.key),
      ).toEqual([alpha.key, beta.key]);
      expect(storage.calls.listStoredImages).toBe(
        order === "listing-first" ? 2 : 1,
      );
      expect(
        store.set(catalog.integrate, {
          type: "upload-confirmed",
          uploadId: "upload-1",
          image: beta,
          ...captured,
        }),
      ).toEqual({ status: "duplicate" });
    },
  );

  it("joins identical command IDs, rejects conflicts, and permits disjoint mutations", async () => {
    const firstDelete = createDeferred<{
      ok: true;
      value: { deletedKeys: string[] };
    }>();
    const secondDelete = createDeferred<{
      ok: true;
      value: { deletedKeys: string[] };
    }>();
    const storage = createCountedImageStorage({
      overrides: {
        deleteStoredImages: (keys) =>
          keys.includes(alpha.key) ? firstDelete.promise : secondDelete.promise,
      },
    });
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const store = configuredStore();
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });

    const first = store.set(catalog.run, {
      type: "delete",
      keys: [alpha.key],
      commandId: "delete-1",
    });
    const joined = store.set(catalog.run, {
      type: "delete",
      keys: [alpha.key],
      commandId: "delete-1",
    });
    const conflict = store.set(catalog.run, {
      type: "delete",
      keys: [beta.key],
      commandId: "delete-1",
    });
    const overlapping = store.set(catalog.run, {
      type: "rename",
      oldKey: alpha.key,
      newKey: "i/renamed.webp",
    });
    const disjoint = store.set(catalog.run, {
      type: "delete",
      keys: [beta.key],
    });

    expect(joined).toBe(first);
    await expect(conflict).resolves.toEqual({
      status: "command-id-conflict",
      commandId: "delete-1",
    });
    await expect(overlapping).resolves.toEqual({
      status: "keys-busy",
      keys: [alpha.key],
    });
    expect(storage.calls.deleteStoredImages).toHaveLength(2);

    firstDelete.resolve({ ok: true, value: { deletedKeys: [alpha.key] } });
    secondDelete.resolve({ ok: true, value: { deletedKeys: [beta.key] } });
    await expect(first).resolves.toMatchObject({ status: "deleted" });
    await expect(disjoint).resolves.toMatchObject({ status: "deleted" });
  });

  it("releases reservations and command IDs after mutation settlement", async () => {
    const firstDelete = createDeferred<{
      ok: true;
      value: { deletedKeys: string[] };
    }>();
    const secondDelete = createDeferred<{
      ok: true;
      value: { deletedKeys: string[] };
    }>();
    let deletes = 0;
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => ({ ok: true, value: [alpha] }),
        deleteStoredImages: () => {
          deletes++;
          return deletes === 1 ? firstDelete.promise : secondDelete.promise;
        },
      },
    });
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const store = configuredStore();
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    const item = catalog.item(alpha.key);

    const first = store.set(catalog.run, {
      type: "delete",
      keys: [alpha.key],
      commandId: "reusable-delete",
    });
    expect(store.get(item).reserved).toBe(true);
    firstDelete.resolve({ ok: true, value: { deletedKeys: [alpha.key] } });
    await expect(first).resolves.toMatchObject({ status: "deleted" });
    expect(store.get(item).reserved).toBe(false);
    await settle();

    const second = store.set(catalog.run, {
      type: "delete",
      keys: [alpha.key],
      commandId: "reusable-delete",
    });
    expect(second).not.toBe(first);
    expect(store.get(item).reserved).toBe(true);
    expect(storage.calls.deleteStoredImages).toHaveLength(2);
    secondDelete.resolve({ ok: true, value: { deletedKeys: [alpha.key] } });
    await expect(second).resolves.toMatchObject({ status: "deleted" });
    expect(store.get(item).reserved).toBe(false);
  });

  it.each(["listing-first", "fact-first"] as const)(
    "keeps a confirmed delete across the %s completion order",
    async (order) => {
      const listing = createDeferred<{
        ok: true;
        value: (typeof alpha)[];
      }>();
      const deleting = createDeferred<{
        ok: true;
        value: { deletedKeys: string[] };
      }>();
      let listCall = 0;
      const storage = createCountedImageStorage({
        overrides: {
          listStoredImages: () => {
            listCall++;
            if (listCall === 1) {
              return Promise.resolve({ ok: true, value: [alpha, beta] });
            }
            return listCall === 2
              ? listing.promise
              : Promise.resolve({ ok: true, value: [beta] });
          },
          deleteStoredImages: () => deleting.promise,
        },
      });
      const catalog = createImageCatalog({
        createStorage: storage.createStorage,
      });
      const store = configuredStore();
      await store.set(catalog.run, {
        type: "refresh",
        intent: "foreground",
        reason: "manual",
      });
      const refresh = store.set(catalog.run, {
        type: "refresh",
        intent: "background",
        reason: "reconciliation",
      });
      const deletion = store.set(catalog.run, {
        type: "delete",
        keys: [alpha.key],
      });

      if (order === "listing-first") {
        listing.resolve({ ok: true, value: [alpha, beta] });
        await refresh;
      }
      deleting.resolve({
        ok: true,
        value: { deletedKeys: [alpha.key] },
      });
      await deletion;
      if (order === "fact-first") {
        listing.resolve({ ok: true, value: [alpha, beta] });
        await refresh;
      }
      await settle();

      expect(
        store.get(catalog.state).projection.images.map((image) => image.key),
      ).toEqual([beta.key]);
      expect(storage.calls.listStoredImages).toBe(
        order === "listing-first" ? 3 : 2,
      );
    },
  );

  it.each(["listing-first", "fact-first"] as const)(
    "keeps a confirmed rename across the %s completion order",
    async (order) => {
      const listing = createDeferred<{
        ok: true;
        value: (typeof alpha)[];
      }>();
      const renaming = createDeferred<{
        ok: true;
        value: { oldKey: string; newKey: string };
      }>();
      const renamed = { ...alpha, key: "i/renamed.webp" };
      let listCall = 0;
      const storage = createCountedImageStorage({
        overrides: {
          listStoredImages: () => {
            listCall++;
            if (listCall === 1) {
              return Promise.resolve({ ok: true, value: [alpha, beta] });
            }
            return listCall === 2
              ? listing.promise
              : Promise.resolve({ ok: true, value: [renamed, beta] });
          },
          renameStoredImage: () => renaming.promise,
        },
      });
      const catalog = createImageCatalog({
        createStorage: storage.createStorage,
      });
      const store = configuredStore();
      await store.set(catalog.run, {
        type: "refresh",
        intent: "foreground",
        reason: "manual",
      });
      store.set(catalog.view.selection, {
        type: "toggle",
        key: alpha.key,
        checked: true,
        shift: false,
      });
      const refresh = store.set(catalog.run, {
        type: "refresh",
        intent: "background",
        reason: "reconciliation",
      });
      const rename = store.set(catalog.run, {
        type: "rename",
        oldKey: alpha.key,
        newKey: renamed.key,
      });

      if (order === "listing-first") {
        listing.resolve({ ok: true, value: [alpha, beta] });
        await refresh;
      }
      renaming.resolve({
        ok: true,
        value: { oldKey: alpha.key, newKey: renamed.key },
      });
      await rename;
      if (order === "fact-first") {
        listing.resolve({ ok: true, value: [alpha, beta] });
        await refresh;
      }
      await settle();

      expect(
        store.get(catalog.state).projection.images.map((image) => image.key),
      ).toEqual([renamed.key, beta.key]);
      expect([...store.get(catalog.view.selection).keys]).toEqual([
        renamed.key,
      ]);
      expect(storage.calls.listStoredImages).toBe(
        order === "listing-first" ? 3 : 2,
      );
    },
  );

  it("keeps projection and selection unchanged for already-exists", async () => {
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => ({ ok: true, value: [alpha, beta] }),
        renameStoredImage: async (input) => ({
          ok: false,
          error: { reason: "already-exists", key: input.newKey },
        }),
      },
    });
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const store = configuredStore();
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    store.set(catalog.view.selection, {
      type: "toggle",
      key: alpha.key,
      checked: true,
      shift: false,
    });
    const images = store.get(catalog.state).projection.images;
    const item = catalog.item(alpha.key);

    await expect(
      store.set(catalog.run, {
        type: "rename",
        oldKey: alpha.key,
        newKey: beta.key,
      }),
    ).resolves.toEqual({ status: "already-exists", key: beta.key });
    await settle();

    expect(store.get(catalog.state).projection.images).toBe(images);
    expect([...store.get(catalog.view.selection).keys]).toEqual([alpha.key]);
    expect(store.get(item).reserved).toBe(false);
    expect(storage.calls.renameStoredImage).toHaveLength(1);
    expect(storage.calls.listStoredImages).toBe(1);
  });

  it.each(["listing-first", "uncertainty-first"] as const)(
    "runs one post-uncertainty list for delete failure in the %s order",
    async (order) => {
      const olderListing = createDeferred<{
        ok: true;
        value: (typeof alpha | typeof beta)[];
      }>();
      const deleting = createDeferred<{
        ok: false;
        error: { reason: "unknown"; message: string };
      }>();
      let lists = 0;
      const storage = createCountedImageStorage({
        overrides: {
          listStoredImages: () => {
            lists++;
            if (lists === 1) {
              return Promise.resolve({ ok: true, value: [alpha, beta] });
            }
            return lists === 2
              ? olderListing.promise
              : Promise.resolve({ ok: true, value: [alpha, beta] });
          },
          deleteStoredImages: () => deleting.promise,
        },
      });
      const catalog = createImageCatalog({
        createStorage: storage.createStorage,
      });
      const store = configuredStore();
      await store.set(catalog.run, {
        type: "refresh",
        intent: "foreground",
        reason: "manual",
      });
      store.set(catalog.view.selection, {
        type: "toggle",
        key: alpha.key,
        checked: true,
        shift: false,
      });
      const refresh = store.set(catalog.run, {
        type: "refresh",
        intent: "background",
        reason: "reconciliation",
      });
      const deletion = store.set(catalog.run, {
        type: "delete",
        keys: [alpha.key],
      });

      if (order === "listing-first") {
        olderListing.resolve({ ok: true, value: [alpha, beta] });
        await refresh;
      }
      deleting.resolve({
        ok: false,
        error: { reason: "unknown", message: "uncertain delete" },
      });
      await expect(deletion).resolves.toMatchObject({
        status: "delete-failed",
      });
      if (order === "uncertainty-first") {
        expect(store.get(catalog.state).projection.stale).toBe(true);
        olderListing.resolve({ ok: true, value: [alpha, beta] });
        await refresh;
      }
      await settle();

      expect(storage.calls.listStoredImages).toBe(3);
      expect(store.get(catalog.state).projection).toMatchObject({
        images: [alpha, beta],
        stale: false,
      });
      expect([...store.get(catalog.view.selection).keys]).toEqual([]);
    },
  );

  it.each(["listing-first", "uncertainty-first"] as const)(
    "runs one post-uncertainty list for partial rename in the %s order",
    async (order) => {
      const olderListing = createDeferred<{
        ok: true;
        value: (typeof alpha | typeof beta)[];
      }>();
      const renaming = createDeferred<{
        ok: false;
        error: {
          reason: "partial-rename";
          copiedKey: string;
          failedDeleteKey: string;
        };
      }>();
      let lists = 0;
      const renamedKey = "i/renamed.webp";
      const storage = createCountedImageStorage({
        overrides: {
          listStoredImages: () => {
            lists++;
            if (lists === 1) {
              return Promise.resolve({ ok: true, value: [alpha, beta] });
            }
            return lists === 2
              ? olderListing.promise
              : Promise.resolve({ ok: true, value: [alpha, beta] });
          },
          renameStoredImage: () => renaming.promise,
        },
      });
      const catalog = createImageCatalog({
        createStorage: storage.createStorage,
      });
      const store = configuredStore();
      await store.set(catalog.run, {
        type: "refresh",
        intent: "foreground",
        reason: "manual",
      });
      store.set(catalog.view.selection, {
        type: "toggle",
        key: alpha.key,
        checked: true,
        shift: false,
      });
      const refresh = store.set(catalog.run, {
        type: "refresh",
        intent: "background",
        reason: "reconciliation",
      });
      const rename = store.set(catalog.run, {
        type: "rename",
        oldKey: alpha.key,
        newKey: renamedKey,
      });

      if (order === "listing-first") {
        olderListing.resolve({ ok: true, value: [alpha, beta] });
        await refresh;
      }
      renaming.resolve({
        ok: false,
        error: {
          reason: "partial-rename",
          copiedKey: renamedKey,
          failedDeleteKey: alpha.key,
        },
      });
      await expect(rename).resolves.toEqual({
        status: "partial-rename",
        copiedKey: renamedKey,
        failedDeleteKey: alpha.key,
      });
      if (order === "uncertainty-first") {
        expect(store.get(catalog.state).projection.stale).toBe(true);
        olderListing.resolve({ ok: true, value: [alpha, beta] });
        await refresh;
      }
      await settle();

      expect(storage.calls.listStoredImages).toBe(3);
      expect(store.get(catalog.state).projection).toMatchObject({
        images: [alpha, beta],
        stale: false,
      });
      expect([...store.get(catalog.view.selection).keys]).toEqual([alpha.key]);
    },
  );

  it("performs no adapter work for invalid settings", async () => {
    const storage = createCountedImageStorage();
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const store = createStore();

    await expect(
      store.set(catalog.run, {
        type: "refresh",
        intent: "foreground",
        reason: "manual",
      }),
    ).resolves.toMatchObject({ status: "invalid-settings" });
    await expect(
      store.set(catalog.run, {
        type: "access",
        key: alpha.key,
        purpose: "probe",
      }),
    ).resolves.toMatchObject({ status: "invalid-settings" });
    await expect(
      store.set(catalog.run, {
        type: "access",
        key: alpha.key,
        purpose: "download",
      }),
    ).resolves.toMatchObject({ status: "invalid-settings" });
    await expect(
      store.set(catalog.run, {
        type: "access",
        key: alpha.key,
        purpose: "url",
      }),
    ).resolves.toMatchObject({ status: "invalid-settings" });
    await expect(
      store.set(catalog.run, {
        type: "access",
        key: alpha.key,
        purpose: "markdown",
      }),
    ).resolves.toMatchObject({ status: "invalid-settings" });
    await expect(
      store.set(catalog.run, { type: "delete", keys: [alpha.key] }),
    ).resolves.toMatchObject({ status: "invalid-settings" });
    await expect(
      store.set(catalog.run, {
        type: "rename",
        oldKey: alpha.key,
        newKey: "i/renamed.webp",
      }),
    ).resolves.toMatchObject({ status: "invalid-settings" });
    expect(storage.calls.createStorage).toHaveLength(0);
  });

  it("joins probes by key and operation context, then rejects stale completion", async () => {
    const probing = createDeferred<{
      ok: true;
      value: { key: string; contentType: string };
    }>();
    let probeCall = 0;
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => ({ ok: true, value: [alpha] }),
        probeStoredImage: () => {
          probeCall++;
          return probeCall === 1
            ? probing.promise
            : Promise.resolve({
                ok: true,
                value: { key: alpha.key, contentType: "image/webp" },
              });
        },
      },
    });
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const store = configuredStore();
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    const item = catalog.item(alpha.key);
    const firstCapability = store.get(item).access;
    const stateBeforeSettingsChange = store.get(catalog.state);
    expect(Object.keys(firstCapability ?? {})).toEqual(["source"]);

    const first = store.set(catalog.run, {
      type: "access",
      key: alpha.key,
      purpose: "probe",
    });
    const joined = store.set(catalog.run, {
      type: "access",
      key: alpha.key,
      purpose: "probe",
    });
    expect(joined).toBe(first);
    expect(storage.calls.probeStoredImage).toEqual([alpha.key]);

    store.set(settings.storage, {
      type: "update",
      value: { ...firstTarget, region: "eu-west-1" },
    });
    expect(store.get(catalog.state).projection).toBe(
      stateBeforeSettingsChange.projection,
    );
    expect(store.get(catalog.state).gallery).toBe(
      stateBeforeSettingsChange.gallery,
    );
    expect(store.get(item).access).not.toBe(firstCapability);
    probing.resolve({
      ok: true,
      value: { key: alpha.key, contentType: "image/webp" },
    });
    await expect(first).resolves.toEqual({ status: "superseded" });

    await expect(
      store.set(catalog.run, {
        type: "access",
        key: alpha.key,
        purpose: "probe",
      }),
    ).resolves.toMatchObject({
      status: "accessed",
      purpose: "probe",
      value: { contentType: "image/webp" },
    });
    expect(storage.calls.probeStoredImage).toEqual([alpha.key, alpha.key]);
  });

  it("supersedes every old catalog operation across profile replacement", async () => {
    const listing = createDeferred<{
      ok: true;
      value: (typeof alpha | typeof beta)[];
    }>();
    const deleting = createDeferred<{
      ok: true;
      value: { deletedKeys: string[] };
    }>();
    const renaming = createDeferred<{
      ok: true;
      value: { oldKey: string; newKey: string };
    }>();
    const probing = createDeferred<{
      ok: true;
      value: { key: string; contentType: string };
    }>();
    const downloading = createDeferred<{
      ok: true;
      value: { key: string; body: Blob };
    }>();
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: () => listing.promise,
        deleteStoredImages: () => deleting.promise,
        renameStoredImage: () => renaming.promise,
        probeStoredImage: () => probing.promise,
        downloadStoredImage: () => downloading.promise,
      },
    });
    const cache = new ControllableStorage();
    const catalog = createImageCatalog({
      cacheStorage: cache,
      createStorage: storage.createStorage,
    });
    const store = configuredStore();
    const captured = acceptance(store);
    store.set(catalog.integrate, {
      type: "upload-confirmed",
      uploadId: "seed",
      image: alpha,
      ...captured,
    });
    store.set(catalog.integrate, {
      type: "upload-confirmed",
      uploadId: "seed-beta",
      image: beta,
      ...captured,
    });
    await settle();
    const refresh = store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    const deletion = store.set(catalog.run, {
      type: "delete",
      keys: [alpha.key],
    });
    const rename = store.set(catalog.run, {
      type: "rename",
      oldKey: beta.key,
      newKey: "i/renamed.webp",
    });
    const probe = store.set(catalog.run, {
      type: "access",
      key: alpha.key,
      purpose: "probe",
    });
    const download = store.set(catalog.run, {
      type: "access",
      key: alpha.key,
      purpose: "download",
    });
    const cacheWritesBeforeReset = cache.setCalls.length;

    store.set(settings.gallery, (gallery) => ({
      ...gallery,
      autoRefresh: false,
    }));
    store.set(profileGenerationAtom, (generation) => generation + 1);
    expect(store.set(catalog.integrate, { type: "profile-replaced" })).toEqual({
      status: "profile-replaced",
    });
    await expect(refresh).resolves.toEqual({ status: "superseded" });
    await expect(deletion).resolves.toEqual({ status: "superseded" });
    await expect(rename).resolves.toEqual({ status: "superseded" });
    await expect(probe).resolves.toEqual({ status: "superseded" });
    expect(store.get(catalog.state).projection).toMatchObject({
      kind: "unloaded",
      images: [],
    });
    expect(store.get(catalog.state).refresh).toEqual({
      status: "idle",
      lastOutcome: undefined,
    });
    expect(cache.setCalls).toHaveLength(cacheWritesBeforeReset + 1);
    expect(cache.setCalls.at(-1)?.value).toBe("[]");

    listing.resolve({ ok: true, value: [alpha, beta] });
    deleting.resolve({ ok: true, value: { deletedKeys: [alpha.key] } });
    renaming.resolve({
      ok: true,
      value: { oldKey: beta.key, newKey: "i/renamed.webp" },
    });
    probing.resolve({
      ok: true,
      value: { key: alpha.key, contentType: "image/webp" },
    });
    downloading.resolve({
      ok: true,
      value: { key: alpha.key, body: new Blob(["late"]) },
    });
    await expect(download).resolves.toEqual({ status: "superseded" });
    await settle();
    expect(store.get(catalog.state).projection.images).toEqual([]);
    expect(cache.setCalls).toHaveLength(cacheWritesBeforeReset + 1);
    expect(storage.calls.listStoredImages).toBe(1);
  });

  it("keeps item subscriptions local to selection and reservations for that key", async () => {
    const deleting = createDeferred<{
      ok: true;
      value: { deletedKeys: string[] };
    }>();
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => ({ ok: true, value: [alpha, beta] }),
        deleteStoredImages: () => deleting.promise,
      },
    });
    const catalog = createImageCatalog({
      createStorage: storage.createStorage,
    });
    const store = configuredStore();
    await store.set(catalog.run, {
      type: "refresh",
      intent: "foreground",
      reason: "manual",
    });
    const alphaItem = catalog.item(alpha.key);
    let updates = 0;
    let selectionUpdates = 0;
    const unsubscribe = store.sub(alphaItem, () => updates++);
    const unsubscribeSelection = store.sub(
      catalog.view.selection,
      () => selectionUpdates++,
    );
    await settle();
    updates = 0;
    selectionUpdates = 0;

    const deletingBeta = store.set(catalog.run, {
      type: "delete",
      keys: [beta.key],
    });
    expect(updates).toBe(0);
    expect(selectionUpdates).toBe(0);

    store.set(catalog.view.selection, {
      type: "toggle",
      key: alpha.key,
      checked: true,
      shift: false,
    });
    expect(updates).toBe(1);
    expect(selectionUpdates).toBe(1);

    deleting.resolve({ ok: true, value: { deletedKeys: [beta.key] } });
    await deletingBeta;
    unsubscribe();
    unsubscribeSelection();
  });

  it("reports cache failure without rollback or remote retry", async () => {
    const cache = new ControllableStorage();
    cache.failWrites();
    const storage = createCountedImageStorage({
      overrides: {
        listStoredImages: async () => ({ ok: true, value: [alpha] }),
      },
    });
    const catalog = createImageCatalog({
      cacheStorage: cache,
      createStorage: storage.createStorage,
    });
    const store = configuredStore();
    const captured = acceptance(store);

    expect(
      store.set(catalog.integrate, {
        type: "upload-confirmed",
        uploadId: "upload-1",
        image: alpha,
        ...captured,
      }),
    ).toMatchObject({ status: "accepted" });
    expect(store.get(catalog.state).projection).toMatchObject({
      images: [alpha],
      cacheDiagnostic: { operation: "persist" },
    });
    await settle();
    expect(store.get(catalog.state).projection.images).toEqual([alpha]);
    expect(cache.setCalls).toHaveLength(2);
    expect(storage.calls.createStorage).toHaveLength(1);
    expect(storage.calls.listStoredImages).toBe(1);
  });
});

function configuredStore() {
  const store = createStore();
  store.set(settings.storage, { type: "update", value: firstTarget });
  return store;
}

function acceptance(store: ReturnType<typeof createStore>) {
  return {
    generation: store.get(profileGenerationAtom),
    storageRevision: store.get(settings.storage).revision,
  };
}
