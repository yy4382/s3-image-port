import { describe, expect, it, vi, beforeEach } from "vitest";

import type { S3Options } from "@/stores/schemas/settings";
import { createS3ImageStorageAdapter } from "./s3";

const mocks = vi.hoisted(() => ({
  listFn: vi.fn(),
}));

vi.mock("@/lib/s3/image-s3-client", () => ({
  default: class MockImageS3Client {
    list = mocks.listFn;
  },
}));

const s3Settings: S3Options = {
  endpoint: "https://s3.example.com",
  bucket: "images",
  region: "us-east-1",
  accKeyId: "access-key",
  secretAccKey: "secret-key",
  forcePathStyle: false,
  pubUrl: "https://cdn.example.com",
  includePath: "",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("S3 image storage adapter", () => {
  it("maps S3 list objects to StoredImage values", async () => {
    mocks.listFn.mockResolvedValueOnce([
      {
        Key: "i/one.webp",
        LastModified: "2026-07-06T10:00:00.000Z",
        url: "https://cdn.example.com/i/one.webp",
      },
    ]);

    await expect(
      createS3ImageStorageAdapter(s3Settings).listStoredImages(),
    ).resolves.toEqual({
      ok: true,
      value: [
        {
          key: "i/one.webp",
          lastModified: "2026-07-06T10:00:00.000Z",
          url: "https://cdn.example.com/i/one.webp",
        },
      ],
    });
  });

  it("maps failed S3 listing to a typed storage failure", async () => {
    mocks.listFn.mockRejectedValueOnce(new Error("network unavailable"));

    await expect(
      createS3ImageStorageAdapter(s3Settings).listStoredImages(),
    ).resolves.toEqual({
      ok: false,
      error: {
        reason: "unknown",
        message: "network unavailable",
      },
    });
  });
});
