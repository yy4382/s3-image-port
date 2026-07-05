import { describe, expect, it } from "vitest";

import {
  imageStorageFailureSchema,
  storedImageListResultSchema,
  storedImageSchema,
} from "./schema";

describe("storedImageSchema", () => {
  it("parses stored image metadata", () => {
    const parsed = storedImageSchema.parse({
      key: "i/2026/07/example.webp",
      url: "https://cdn.example.com/i/2026/07/example.webp",
      lastModified: "2026-07-06T10:00:00.000Z",
    });

    expect(parsed).toEqual({
      key: "i/2026/07/example.webp",
      url: "https://cdn.example.com/i/2026/07/example.webp",
      lastModified: "2026-07-06T10:00:00.000Z",
    });
  });

  it("rejects stored images without a storage key", () => {
    const result = storedImageSchema.safeParse({
      key: "",
      url: "https://cdn.example.com/image.webp",
    });

    expect(result.success).toBe(false);
  });
});

describe("imageStorageFailureSchema", () => {
  it("parses expected storage failures", () => {
    expect(
      imageStorageFailureSchema.parse({
        reason: "already-exists",
        key: "i/existing.webp",
      }),
    ).toEqual({ reason: "already-exists", key: "i/existing.webp" });

    expect(
      imageStorageFailureSchema.parse({
        reason: "cors-incomplete",
        allowedMethods: ["GET", "HEAD"],
        missingMethods: ["PUT", "POST", "DELETE"],
      }),
    ).toEqual({
      reason: "cors-incomplete",
      allowedMethods: ["GET", "HEAD"],
      missingMethods: ["PUT", "POST", "DELETE"],
    });

    expect(
      imageStorageFailureSchema.parse({
        reason: "partial-rename",
        copiedKey: "i/new.webp",
        failedDeleteKey: "i/old.webp",
      }),
    ).toEqual({
      reason: "partial-rename",
      copiedKey: "i/new.webp",
      failedDeleteKey: "i/old.webp",
    });
  });

  it("rejects unknown failure reasons", () => {
    const result = imageStorageFailureSchema.safeParse({
      reason: "provider-threw",
    });

    expect(result.success).toBe(false);
  });
});

describe("storedImageListResultSchema", () => {
  it("parses successful and failed list results", () => {
    expect(
      storedImageListResultSchema.parse({
        ok: true,
        value: [
          {
            key: "i/a.webp",
            url: "https://cdn.example.com/i/a.webp",
          },
        ],
      }),
    ).toEqual({
      ok: true,
      value: [
        {
          key: "i/a.webp",
          url: "https://cdn.example.com/i/a.webp",
        },
      ],
    });

    expect(
      storedImageListResultSchema.parse({
        ok: false,
        error: { reason: "access-denied" },
      }),
    ).toEqual({
      ok: false,
      error: { reason: "access-denied" },
    });
  });
});
