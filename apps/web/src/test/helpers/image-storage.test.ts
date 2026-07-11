import { describe, expect, it, vi } from "vitest";

import { createMemoryImageStorageAdapter } from "@/modules/image-storage/adapters/memory";
import { getDefaultOptions } from "@/stores/schemas/settings";

import type {
  StoredImageDeleteResult,
  StoredImageListResult,
} from "@/modules/image-storage";

import { createDeferred, settle } from "./deterministic";
import { createCountedImageStorage } from "./image-storage";
import { ControllableStorage } from "./storage";

describe("counted image storage", () => {
  it("distinguishes adapter construction from every remote operation", async () => {
    const settings = getDefaultOptions().s3;
    const counted = createCountedImageStorage({
      storage: createMemoryImageStorageAdapter({
        images: [{ key: "i/existing.webp" }],
      }),
    });
    const storage = counted.createStorage(settings);
    const persistence = new ControllableStorage();
    const uploadBody = new Blob(["image"]);

    await storage.listStoredImages();
    await storage.putStoredImage({
      key: "i/uploaded.webp",
      body: uploadBody,
      contentType: "image/webp",
    });
    await storage.probeStoredImage("i/uploaded.webp");
    await storage.downloadStoredImage("i/uploaded.webp");
    await storage.renameStoredImage({
      oldKey: "i/uploaded.webp",
      newKey: "i/renamed.webp",
    });
    await storage.deleteStoredImages(["i/existing.webp"]);
    await storage.checkAccess({ origin: "https://app.example.com" });
    persistence.setItem("s3ip:gallery:photos", "[]");

    expect(counted.calls).toEqual({
      createStorage: [settings],
      listStoredImages: 1,
      putStoredImage: [
        {
          key: "i/uploaded.webp",
          body: uploadBody,
          contentType: "image/webp",
        },
      ],
      deleteStoredImages: [["i/existing.webp"]],
      renameStoredImage: [
        { oldKey: "i/uploaded.webp", newKey: "i/renamed.webp" },
      ],
      downloadStoredImage: ["i/uploaded.webp"],
      probeStoredImage: ["i/uploaded.webp"],
      checkAccess: [{ origin: "https://app.example.com" }],
    });

    const settledCounts = structuredClone({
      ...counted.calls,
      createStorage: counted.calls.createStorage.length,
      persistenceWrites: persistence.setCalls.length,
    });
    vi.useFakeTimers();
    setTimeout(() => {}, 20);
    await settle({
      timers: () => {
        vi.advanceTimersByTime(20);
      },
    });
    expect({
      ...counted.calls,
      createStorage: counted.calls.createStorage.length,
      persistenceWrites: persistence.setCalls.length,
    }).toEqual(settledCounts);
    vi.useRealTimers();
  });

  it("allows listing and mutation calls to complete in both orders", async () => {
    for (const order of [
      ["listing", "mutation"],
      ["mutation", "listing"],
    ] as const) {
      const listing = createDeferred<StoredImageListResult>();
      const mutation = createDeferred<StoredImageDeleteResult>();
      const counted = createCountedImageStorage({
        overrides: {
          listStoredImages: () => listing.promise,
          deleteStoredImages: () => mutation.promise,
        },
      });
      const storage = counted.createStorage(getDefaultOptions().s3);
      const completions: string[] = [];

      void storage.listStoredImages().then(() => completions.push("listing"));
      void storage
        .deleteStoredImages(["i/deleted.webp"])
        .then(() => completions.push("mutation"));

      for (const name of order) {
        if (name === "listing") {
          listing.resolve({ ok: true, value: [{ key: "i/listed.webp" }] });
        } else {
          mutation.resolve({
            ok: true,
            value: { deletedKeys: ["i/deleted.webp"] },
          });
        }
        await settle();
      }

      expect(completions).toEqual(order);
      expect(counted.calls.listStoredImages).toBe(1);
      expect(counted.calls.deleteStoredImages).toEqual([["i/deleted.webp"]]);
    }
  });
});
