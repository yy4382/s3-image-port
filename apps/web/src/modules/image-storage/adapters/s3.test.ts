import { describe, expect, it, vi, beforeEach } from "vitest";

import type { S3Options } from "@/stores/schemas/settings";
import { createS3ImageStorage } from "./s3";

const mocks = vi.hoisted(() => ({
  listFn: vi.fn(),
  checkListFn: vi.fn(),
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
    checkList = mocks.checkListFn;
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
      },
    ]);

    await expect(
      createS3ImageStorage(s3Settings).listStoredImages(),
    ).resolves.toEqual({
      ok: true,
      value: [
        {
          key: "i/one.webp",
          lastModified: "2026-07-06T10:00:00.000Z",
        },
      ],
    });
  });

  it("maps failed S3 listing to a typed storage failure", async () => {
    mocks.listFn.mockRejectedValueOnce(new Error("network unavailable"));

    await expect(
      createS3ImageStorage(s3Settings).listStoredImages(),
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
      createS3ImageStorage(s3Settings).putStoredImage({
        key: "i/uploaded.webp",
        body: new Blob(["image bytes"], { type: "image/webp" }),
        contentType: "image/webp",
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        key: "i/uploaded.webp",
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
      createS3ImageStorage(s3Settings).putStoredImage({
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
      createS3ImageStorage(s3Settings).deleteStoredImages(["i/missing.webp"]),
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
      createS3ImageStorage(s3Settings).deleteStoredImages(["i/forbidden.webp"]),
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
      createS3ImageStorage(s3Settings).renameStoredImage({
        oldKey: "i/source.webp",
        newKey: "i/existing.webp",
      }),
    ).resolves.toEqual({
      ok: false,
      error: { reason: "already-exists", key: "i/existing.webp" },
    });

    mocks.renameFn.mockRejectedValueOnce(
      new Error(
        "Renamed to i/new.webp but failed to delete old key i/source.webp",
      ),
    );

    await expect(
      createS3ImageStorage(s3Settings).renameStoredImage({
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
      createS3ImageStorage(s3Settings).renameStoredImage({
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
        transformToByteArray: async () =>
          new TextEncoder().encode("image bytes"),
      },
    });

    const result =
      await createS3ImageStorage(s3Settings).downloadStoredImage(
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
      createS3ImageStorage(s3Settings).downloadStoredImage("i/missing.webp"),
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
      createS3ImageStorage(s3Settings).probeStoredImage("i/source.webp"),
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

  it("tests a list read without listing images or reading CORS", async () => {
    mocks.checkListFn.mockResolvedValueOnce({
      $metadata: { httpStatusCode: 200 },
    });
    const signal = new AbortController().signal;
    await expect(
      createS3ImageStorage(s3Settings).checkAccess({
        origin: "https://app.example.com",
        signal,
      }),
    ).resolves.toEqual({ ok: true, value: { httpStatus: 200 } });
    expect(mocks.checkListFn).toHaveBeenCalledExactlyOnceWith(signal);
    expect(mocks.listFn).not.toHaveBeenCalled();
    expect(mocks.getCorsFn).not.toHaveBeenCalled();
    expect(mocks.uploadFn).not.toHaveBeenCalled();
  });

  it.each([
    "AccessDenied",
    "InvalidAccessKeyId",
    "NoSuchBucket",
    "SignatureDoesNotMatch",
    "CustomServiceError",
  ])("preserves readable %s instead of folding it into 403", async (code) => {
    mocks.checkListFn.mockRejectedValueOnce({
      name: code,
      message: "secret must not escape",
      $metadata: { httpStatusCode: 403 },
    });
    await expect(
      createS3ImageStorage(s3Settings).checkAccess({
        origin: "https://app.example.com",
      }),
    ).resolves.toEqual({
      ok: false,
      error: { reason: "server", code, httpStatus: 403 },
    });
  });

  it.each([["*"], ["https://*.example.com"], ["https://app.example.com"]])(
    "accepts origin %s without requiring POST or wildcard headers",
    async (origin) => {
      mocks.getCorsFn.mockResolvedValueOnce({
        $metadata: {},
        CORSRules: [
          {
            AllowedOrigins: [origin],
            AllowedMethods: ["GET", "HEAD", "PUT", "DELETE"],
            AllowedHeaders: ["Content-Type", "x-amz-*"],
          },
        ],
      });
      await expect(
        createS3ImageStorage(s3Settings).checkCors({
          origin: "https://app.example.com",
        }),
      ).resolves.toEqual({
        ok: true,
        value: { originMatched: true, missingMethods: [] },
      });
    },
  );

  it("reports missing methods only for rules matching the current origin", async () => {
    mocks.getCorsFn.mockResolvedValueOnce({
      $metadata: {},
      CORSRules: [
        {
          AllowedOrigins: ["https://app.example.com"],
          AllowedMethods: ["GET", "HEAD"],
        },
        {
          AllowedOrigins: ["https://other.example.com"],
          AllowedMethods: ["PUT", "DELETE"],
        },
      ],
    });
    await expect(
      createS3ImageStorage(s3Settings).checkCors({
        origin: "https://app.example.com",
      }),
    ).resolves.toEqual({
      ok: true,
      value: { originMatched: true, missingMethods: ["PUT", "DELETE"] },
    });
  });

  it.each([
    { CORSRules: [] },
    {
      CORSRules: [
        {
          AllowedOrigins: ["https://*.example.com"],
          AllowedMethods: ["GET", "HEAD", "PUT", "DELETE"],
        },
      ],
    },
  ])(
    "reports a missing origin without inventing permission evidence",
    async ({ CORSRules }) => {
      mocks.getCorsFn.mockResolvedValueOnce({ $metadata: {}, CORSRules });
      await expect(
        createS3ImageStorage(s3Settings).checkCors({
          origin: "https://appXexample.com",
        }),
      ).resolves.toEqual({
        ok: true,
        value: {
          originMatched: false,
          missingMethods: ["GET", "HEAD", "PUT", "DELETE"],
        },
      });
    },
  );

  it.each(["AccessDenied", "NoSuchCORSConfiguration", "NotImplemented"])(
    "preserves CORS API %s",
    async (code) => {
      mocks.getCorsFn.mockRejectedValueOnce({
        name: code,
        $metadata: { httpStatusCode: 403 },
      });
      await expect(
        createS3ImageStorage(s3Settings).checkCors({
          origin: "https://app.example.com",
        }),
      ).resolves.toEqual({
        ok: false,
        error: { reason: "server", code, httpStatus: 403 },
      });
    },
  );
});
