import { beforeEach, describe, expect, it } from "vitest";
import {
  getDefaultOptions,
  migrateFromV1,
  optionsAtom,
} from "./settings-store";
import { renderHook } from "@testing-library/react";
import { useAtom } from "jotai";

describe("settings-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should load from local storage", () => {
    localStorage.setItem(
      "s3ip:options",
      JSON.stringify({
        data: {
          s3: {
            endpoint: "",
            bucket: "aaa",
            region: "",
            accKeyId: "",
            secretAccKey: "",
            forcePathStyle: false,
            pubUrl: "",
          },
          upload: {
            keyTemplate: "A_TEST/{{ulid-dayslice}}/{{ext}}",
            compressionOption: null,
          },
          gallery: {
            autoRefresh: true,
          },
        },
        version: 1,
      }),
    );
    const { result } = renderHook(() => useAtom(optionsAtom));
    expect(result.current[0].upload.keyTemplate).toMatch(/A_TEST/);
  });

  it("should work if empty", () => {
    const { result } = renderHook(() => useAtom(optionsAtom));
    expect(result.current[0]).toEqual(getDefaultOptions());
  });
  it("should work with corrupted data", () => {
    localStorage.setItem("s3ip:options", JSON.stringify({ random: "thing" }));
    const { result } = renderHook(() => useAtom(optionsAtom));
    expect(result.current[0]).toEqual(getDefaultOptions());
  });
  it("should work with unknown version", () => {
    localStorage.setItem("s3ip:options", JSON.stringify({ version: 999 }));
    const { result } = renderHook(() => useAtom(optionsAtom));
    expect(result.current[0]).toEqual(getDefaultOptions());
  });
  describe("migrateFromV1", () => {
    const validV1Config = {
      s3: {
        endpoint: "https://example.com",
        bucket: "image-dev",
        region: "auto",
        accKeyId: "1234567890",
        secretAccKey: "1234567890",
        pubUrl: "https://pub.example.com",
        forcePathStyle: false,
      },
      app: {
        noLongerShowRootPage: true,
        convertType: "none",
        compressionMaxSize: "",
        compressionMaxWidthOrHeight: "",
        keyTemplate: "test/{{random}}/{{ext}}",
        enableAutoRefresh: false,
        enableFuzzySearch: true,
        fuzzySearchThreshold: 0.6,
      },
    };
    it("should work with valid v1 string", () => {
      const result = migrateFromV1(JSON.stringify(validV1Config));
      expect(result).not.toBeInstanceOf(Error);
      if (result instanceof Error) {
        throw result;
      }
      expect(result.s3.endpoint).toEqual(validV1Config.s3.endpoint);
      expect(result.upload.keyTemplate).toEqual(validV1Config.app.keyTemplate);
    });
    it("should set default key template if not set", () => {
      const newV1 = structuredClone(validV1Config);
      newV1.app.keyTemplate = "";
      const result = migrateFromV1(JSON.stringify(newV1));
      expect(result).not.toBeInstanceOf(Error);
      if (result instanceof Error) {
        throw result;
      }
      expect(result.upload.keyTemplate).toEqual(
        getDefaultOptions().upload.keyTemplate,
      );
    });
    it("should handle invalid v1 string", () => {
      const result = migrateFromV1("invalid");
      expect(result).toBeInstanceOf(Error);
    });
    it("should handle random types", () => {
      const result = migrateFromV1(1);
      expect(result).toBeInstanceOf(Error);
    });
    it("should also work with object", () => {
      const result = migrateFromV1(structuredClone(validV1Config));
      expect(result).not.toBeInstanceOf(Error);
    });
  });
});
