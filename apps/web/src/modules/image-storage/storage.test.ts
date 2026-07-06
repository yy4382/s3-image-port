import { describe, expect, it } from "vitest";

import { createMemoryImageStorageAdapter } from "./adapters/memory";

describe("image storage", () => {
  it("lists stored images through the storage interface", async () => {
    const storage = createMemoryImageStorageAdapter({
      images: [
        {
          key: "i/one.webp",
          url: "https://cdn.example.com/i/one.webp",
          lastModified: "2026-07-06T10:00:00.000Z",
        },
      ],
    });

    await expect(storage.listStoredImages()).resolves.toEqual({
      ok: true,
      value: [
        {
          key: "i/one.webp",
          url: "https://cdn.example.com/i/one.webp",
          lastModified: "2026-07-06T10:00:00.000Z",
        },
      ],
    });
  });

  it("stores, probes, and downloads a stored image", async () => {
    const storage = createMemoryImageStorageAdapter({
      now: () => new Date("2026-07-06T10:00:00.000Z"),
      publicBaseUrl: "https://cdn.example.com",
    });
    const body = new Blob(["image bytes"], { type: "image/webp" });

    await expect(
      storage.putStoredImage({ key: "i/uploaded.webp", body }),
    ).resolves.toEqual({
      ok: true,
      value: {
        key: "i/uploaded.webp",
        url: "https://cdn.example.com/i/uploaded.webp",
        lastModified: "2026-07-06T10:00:00.000Z",
      },
    });

    await expect(storage.probeStoredImage("i/uploaded.webp")).resolves.toEqual({
      ok: true,
      value: {
        key: "i/uploaded.webp",
        lastModified: "2026-07-06T10:00:00.000Z",
        contentType: "image/webp",
        size: 11,
      },
    });

    const download = await storage.downloadStoredImage("i/uploaded.webp");
    expect(download.ok).toBe(true);
    if (download.ok) {
      expect(download.value.key).toBe("i/uploaded.webp");
      await expect(download.value.body.text()).resolves.toBe("image bytes");
    }
  });

  it("returns typed failures for missing and conflicting stored images", async () => {
    const storage = createMemoryImageStorageAdapter({
      images: [
        {
          key: "i/existing.webp",
          url: "https://cdn.example.com/i/existing.webp",
        },
      ],
    });

    await expect(
      storage.downloadStoredImage("i/missing.webp"),
    ).resolves.toEqual({
      ok: false,
      error: { reason: "not-found", key: "i/missing.webp" },
    });

    await expect(
      storage.renameStoredImage({
        oldKey: "i/missing.webp",
        newKey: "i/new.webp",
      }),
    ).resolves.toEqual({
      ok: false,
      error: { reason: "not-found", key: "i/missing.webp" },
    });

    await storage.putStoredImage({
      key: "i/source.webp",
      body: new Blob(["source"], { type: "image/webp" }),
    });

    await expect(
      storage.renameStoredImage({
        oldKey: "i/source.webp",
        newKey: "i/existing.webp",
      }),
    ).resolves.toEqual({
      ok: false,
      error: { reason: "already-exists", key: "i/existing.webp" },
    });
  });

  it("can explicitly overwrite during rename", async () => {
    const storage = createMemoryImageStorageAdapter({
      publicBaseUrl: "https://cdn.example.com",
      images: [
        {
          key: "i/source.webp",
          url: "https://cdn.example.com/i/source.webp",
        },
        {
          key: "i/target.webp",
          url: "https://cdn.example.com/i/target.webp",
        },
      ],
    });

    await expect(
      storage.renameStoredImage({
        oldKey: "i/source.webp",
        newKey: "i/target.webp",
        overwrite: true,
      }),
    ).resolves.toEqual({
      ok: true,
      value: { oldKey: "i/source.webp", newKey: "i/target.webp" },
    });

    await expect(storage.probeStoredImage("i/source.webp")).resolves.toEqual({
      ok: false,
      error: { reason: "not-found", key: "i/source.webp" },
    });
  });

  it("reports access capability through typed results", async () => {
    const storage = createMemoryImageStorageAdapter({
      allowedMethods: ["GET", "HEAD"],
    });

    await expect(
      storage.checkAccess({ origin: "https://app.example.com" }),
    ).resolves.toEqual({
      ok: false,
      error: {
        reason: "cors-incomplete",
        allowedMethods: ["GET", "HEAD"],
        missingMethods: ["PUT", "POST", "DELETE"],
      },
    });
  });
});
