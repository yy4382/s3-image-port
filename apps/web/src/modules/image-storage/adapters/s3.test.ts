import { describe, expect, it, vi, beforeEach } from "vitest";

import type { S3Options } from "@/stores/schemas/settings";
import { createS3ImageStorageAdapter } from "./s3";

const mocks = vi.hoisted(() => ({
  listFn: vi.fn(),
  uploadFn: vi.fn(),
  deleteFn: vi.fn(),
  renameFn: vi.fn(),
  getFn: vi.fn(),
  headFn: vi.fn(),
  getCorsFn: vi.fn(),
}));

vi.mock("./image-s3-client", () => ({
  default: class MockImageS3Client {
    list = mocks.listFn;
    upload = mocks.uploadFn;
    delete = mocks.deleteFn;
    rename = mocks.renameFn;
    get = mocks.getFn;
    head = mocks.headFn;
    getCors = mocks.getCorsFn;
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

  it("maps S3 upload success to a StoredImage value", async () => {
    mocks.uploadFn.mockResolvedValueOnce({
      $metadata: { httpStatusCode: 200 },
    });

    await expect(
      createS3ImageStorageAdapter(s3Settings).putStoredImage({
        key: "i/uploaded.webp",
        body: new Blob(["image bytes"], { type: "image/webp" }),
        contentType: "image/webp",
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        key: "i/uploaded.webp",
        url: "https://cdn.example.com/i/uploaded.webp",
      },
    });
  });

  it("maps failed S3 uploads to typed storage failures", async () => {
    mocks.uploadFn.mockRejectedValueOnce(
      Object.assign(new Error("forbidden"), {
        name: "AccessDenied",
        $metadata: { httpStatusCode: 403 },
      }),
    );

    await expect(
      createS3ImageStorageAdapter(s3Settings).putStoredImage({
        key: "i/forbidden.webp",
        body: new Blob(["image bytes"], { type: "image/webp" }),
      }),
    ).resolves.toEqual({
      ok: false,
      error: { reason: "access-denied" },
    });
  });

  it("maps failed S3 delete to typed storage failures with the failing key", async () => {
    mocks.deleteFn.mockRejectedValueOnce(
      Object.assign(new Error("missing"), {
        name: "NoSuchKey",
        $metadata: { httpStatusCode: 404 },
      }),
    );

    await expect(
      createS3ImageStorageAdapter(s3Settings).deleteStoredImages([
        "i/missing.webp",
      ]),
    ).resolves.toEqual({
      ok: false,
      error: { reason: "not-found", key: "i/missing.webp" },
    });
  });

  it("maps S3 access denial to typed storage failures", async () => {
    mocks.deleteFn.mockRejectedValueOnce(
      Object.assign(new Error("forbidden"), {
        name: "AccessDenied",
        $metadata: { httpStatusCode: 403 },
      }),
    );

    await expect(
      createS3ImageStorageAdapter(s3Settings).deleteStoredImages([
        "i/forbidden.webp",
      ]),
    ).resolves.toEqual({
      ok: false,
      error: { reason: "access-denied" },
    });
  });

  it("maps S3 rename conflicts and partial rename failures to typed outcomes", async () => {
    mocks.renameFn.mockRejectedValueOnce(
      new Error("Object already exists at key"),
    );

    await expect(
      createS3ImageStorageAdapter(s3Settings).renameStoredImage({
        oldKey: "i/source.webp",
        newKey: "i/existing.webp",
      }),
    ).resolves.toEqual({
      ok: false,
      error: { reason: "already-exists", key: "i/existing.webp" },
    });

    mocks.renameFn.mockRejectedValueOnce(
      new Error("Renamed to i/new.webp but failed to delete old key i/source.webp"),
    );

    await expect(
      createS3ImageStorageAdapter(s3Settings).renameStoredImage({
        oldKey: "i/source.webp",
        newKey: "i/new.webp",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        reason: "partial-rename",
        copiedKey: "i/new.webp",
        failedDeleteKey: "i/source.webp",
      },
    });
  });

  it("maps unknown S3 rename failures to typed unknown failures", async () => {
    mocks.renameFn.mockRejectedValueOnce(new Error("rename failed"));

    await expect(
      createS3ImageStorageAdapter(s3Settings).renameStoredImage({
        oldKey: "i/source.webp",
        newKey: "i/new.webp",
      }),
    ).resolves.toEqual({
      ok: false,
      error: { reason: "unknown", message: "rename failed" },
    });
  });

  it("converts S3 download bodies to browser blobs", async () => {
    mocks.getFn.mockResolvedValueOnce({
      Body: {
        transformToByteArray: async () => new TextEncoder().encode("image bytes"),
      },
    });

    const result =
      await createS3ImageStorageAdapter(s3Settings).downloadStoredImage(
        "i/source.webp",
      );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.key).toBe("i/source.webp");
      await expect(result.value.body.text()).resolves.toBe("image bytes");
    }
  });

  it("maps failed S3 downloads to typed storage failures", async () => {
    mocks.getFn.mockRejectedValueOnce(
      Object.assign(new Error("missing"), {
        name: "NoSuchKey",
        $metadata: { httpStatusCode: 404 },
      }),
    );

    await expect(
      createS3ImageStorageAdapter(s3Settings).downloadStoredImage(
        "i/missing.webp",
      ),
    ).resolves.toEqual({
      ok: false,
      error: { reason: "not-found", key: "i/missing.webp" },
    });
  });

  it("maps S3 object probes to stored image metadata", async () => {
    mocks.headFn.mockResolvedValueOnce({
      LastModified: new Date("2026-07-06T10:00:00.000Z"),
      ContentType: "image/webp",
      ContentLength: 1234,
    });

    await expect(
      createS3ImageStorageAdapter(s3Settings).probeStoredImage("i/source.webp"),
    ).resolves.toEqual({
      ok: true,
      value: {
        key: "i/source.webp",
        lastModified: "2026-07-06T10:00:00.000Z",
        contentType: "image/webp",
        size: 1234,
      },
    });
  });

  it("reports valid access when CORS allows required methods for the current origin and wildcard headers", async () => {
    mocks.getCorsFn.mockResolvedValueOnce({
      CORSRules: [
        {
          AllowedOrigins: ["https://app.example.com"],
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
        },
      ],
    });

    await expect(
      createS3ImageStorageAdapter(s3Settings).checkAccess({
        origin: "https://app.example.com",
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        allowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
      },
    });
  });

  it("reports incomplete CORS when no CORS rules are returned", async () => {
    mocks.getCorsFn.mockResolvedValueOnce({});

    await expect(
      createS3ImageStorageAdapter(s3Settings).checkAccess({
        origin: "https://app.example.com",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        reason: "cors-incomplete",
        allowedMethods: [],
        missingMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
      },
    });
  });

  it("preserves allowed and missing methods for incomplete CORS permissions", async () => {
    mocks.getCorsFn.mockResolvedValueOnce({
      CORSRules: [
        {
          AllowedOrigins: ["https://app.example.com"],
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "HEAD"],
        },
      ],
    });

    await expect(
      createS3ImageStorageAdapter(s3Settings).checkAccess({
        origin: "https://app.example.com",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        reason: "cors-incomplete",
        allowedMethods: ["GET", "HEAD"],
        missingMethods: ["PUT", "POST", "DELETE"],
      },
    });
  });

  it("accepts wildcard CORS origins", async () => {
    mocks.getCorsFn.mockResolvedValueOnce({
      CORSRules: [
        {
          AllowedOrigins: ["*"],
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
        },
      ],
    });

    await expect(
      createS3ImageStorageAdapter(s3Settings).checkAccess({
        origin: "https://app.example.com",
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        allowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
      },
    });
  });

  it("requires wildcard CORS headers before accepting allowed methods", async () => {
    mocks.getCorsFn.mockResolvedValueOnce({
      CORSRules: [
        {
          AllowedOrigins: ["https://app.example.com"],
          AllowedHeaders: ["Content-Type"],
          AllowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
        },
      ],
    });

    await expect(
      createS3ImageStorageAdapter(s3Settings).checkAccess({
        origin: "https://app.example.com",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        reason: "cors-incomplete",
        allowedMethods: [],
        missingMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
      },
    });
  });

  it("maps failed access validation to typed access failures", async () => {
    mocks.getCorsFn.mockRejectedValueOnce(
      Object.assign(new Error("forbidden"), {
        name: "AccessDenied",
        $metadata: { httpStatusCode: 403 },
      }),
    );

    await expect(
      createS3ImageStorageAdapter(s3Settings).checkAccess({
        origin: "https://app.example.com",
      }),
    ).resolves.toEqual({
      ok: false,
      error: { reason: "access-denied" },
    });
  });
});
