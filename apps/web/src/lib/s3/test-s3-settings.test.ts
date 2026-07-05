import { describe, expect, it } from "vitest";

import { createImageStorage } from "@/modules/image-storage";
import { createMemoryImageStorageAdapter } from "@/modules/image-storage/adapters/memory";
import type { S3Options } from "@/stores/schemas/settings";
import { testS3Settings } from "./test-s3-settings";

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

describe("testS3Settings", () => {
  it("returns valid access with allowed methods from image storage", async () => {
    const storage = createImageStorage(createMemoryImageStorageAdapter());

    await expect(
      testS3Settings(s3Settings, "https://app.example.com", () => storage),
    ).resolves.toEqual({
      valid: true,
      allowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
    });
  });

  it("maps failed access to the existing no-result validation state", async () => {
    const storage = createImageStorage(
      createMemoryImageStorageAdapter({ accessDenied: true }),
    );

    await expect(
      testS3Settings(s3Settings, "https://app.example.com", () => storage),
    ).resolves.toEqual({
      valid: false,
      type: "no-result",
    });
  });

  it("maps incomplete CORS permissions to the existing no-allowed-methods state", async () => {
    const storage = createImageStorage(
      createMemoryImageStorageAdapter({ allowedMethods: ["GET", "HEAD"] }),
    );

    await expect(
      testS3Settings(s3Settings, "https://app.example.com", () => storage),
    ).resolves.toEqual({
      valid: false,
      type: "no-allowed-methods",
      allowedMethods: ["GET", "HEAD"],
      missingMethods: ["PUT", "POST", "DELETE"],
    });
  });
});
