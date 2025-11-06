import { beforeEach, describe, expect, it } from "vitest";
import { getDefaultOptions, optionsAtom, profilesAtom } from "./settings-store";
import { renderHook } from "vitest-browser-react";
import { Provider, useAtom } from "jotai";
import * as v3Schema from "./schema/v3";
import { produce } from "immer";
import { migrateFromV1 } from "./schema/migrations/v1-v3";

beforeEach(() => {
  localStorage.clear();
});

const TestProvider = Provider;

describe("settings-store", () => {
  it("should load from local storage", async () => {
    localStorage.setItem(
      "s3ip:profiles-list",
      JSON.stringify({
        data: {
          list: [
            [
              "Default",
              {
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
            ],
          ],
          current: 0,
        },
        version: 3,
      }),
    );
    const { result } = await renderHook(() => useAtom(optionsAtom), {
      wrapper: TestProvider,
    });

    expect(result.current[0].upload.keyTemplate).toMatch(/A_TEST/);
  });

  it("should work if empty", async () => {
    const { result } = await renderHook(() => useAtom(optionsAtom), {
      wrapper: TestProvider,
    });
    expect(result.current[0]).toEqual(getDefaultOptions());
  });
  it("should work with corrupted data", async () => {
    localStorage.setItem(
      "s3ip:profiles-list",
      JSON.stringify({ random: "thing" }),
    );
    const { result } = await renderHook(() => useAtom(optionsAtom), {
      wrapper: TestProvider,
    });
    expect(result.current[0]).toEqual(getDefaultOptions());
  });
  it("should work with unknown version", async () => {
    localStorage.setItem(
      "s3ip:profiles-list",
      JSON.stringify({ version: 999, data: "random" }),
    );
    const { result } = await renderHook(() => useAtom(optionsAtom), {
      wrapper: TestProvider,
    });
    expect(result.current[0]).toEqual(getDefaultOptions());
  });
});

describe("v2 to v3 migration", () => {
  it("should migrate", async () => {
    localStorage.clear();
    localStorage.setItem(
      "s3ip:options",
      JSON.stringify({
        version: 2,
        data: produce(v3Schema.getDefaultOptions(), (draft) => {
          draft.s3.endpoint = "https://options.test";
        }),
      }),
    );
    localStorage.setItem(
      "s3ip:profile:profiles",
      JSON.stringify([
        [
          "Default",
          produce(v3Schema.getDefaultOptions(), (draft) => {
            draft.s3.endpoint = "https://profile0.test";
          }),
        ],
        ["Default1", "CURRENT"],
      ]),
    );
    const { result } = await renderHook(() => useAtom(profilesAtom), {
      wrapper: TestProvider,
    });
    expect(result.current[0].list[0][1].s3.endpoint).toEqual(
      "https://profile0.test",
    );
    expect(result.current[0].list[1][1].s3.endpoint).toEqual(
      "https://options.test",
    );
  });

  it("should delete old items when unmount", async () => {
    localStorage.setItem(
      "s3ip:options",
      JSON.stringify({
        version: 2,
        data: produce(v3Schema.getDefaultOptions(), (draft) => {
          draft.s3.endpoint = "https://options.test";
        }),
      }),
    );
    localStorage.setItem(
      "s3ip:profile:profiles",
      JSON.stringify([
        [
          "Default",
          produce(v3Schema.getDefaultOptions(), (draft) => {
            draft.s3.endpoint = "https://profile0.test";
          }),
        ],
        ["Default1", "CURRENT"],
      ]),
    );
    const { result, act, unmount } = await renderHook(
      () => useAtom(profilesAtom),
      {
        wrapper: TestProvider,
      },
    );
    await act(() => {
      result.current[1]((prev) =>
        produce(prev, (draft) => {
          draft.list[0][1].s3.endpoint = "https://profile0.test2";
        }),
      );
    });
    await unmount();
    expect(localStorage.getItem("s3ip:profiles-list")).not.toBeNull();
    expect(localStorage.getItem("s3ip:options")).toBeNull();
    expect(localStorage.getItem("s3ip:profile:profiles")).toBeNull();
  });
  it("should migrate with corrupted options", async () => {
    localStorage.setItem("s3ip:options", JSON.stringify({ random: "thing" }));
    const { result } = await renderHook(() => useAtom(profilesAtom), {
      wrapper: TestProvider,
    });
    expect(result.current[0].list[0][1]).toEqual(v3Schema.getDefaultOptions());
  });
  it("should migrate with only options", async () => {
    localStorage.setItem(
      "s3ip:options",
      JSON.stringify({
        version: 2,
        data: produce(v3Schema.getDefaultOptions(), (draft) => {
          draft.s3.endpoint = "https://options.test";
        }),
      }),
    );
    const { result } = await renderHook(() => useAtom(profilesAtom), {
      wrapper: TestProvider,
    });
    expect(result.current[0].list[0][1].s3.endpoint).toEqual(
      "https://options.test",
    );
    expect(result.current[0].list.length).toEqual(1);
  });
  it("should migrate with corrupted profiles", async () => {
    const newOptions = produce(v3Schema.getDefaultOptions(), (draft) => {
      draft.s3.endpoint = "https://options.test";
    });
    localStorage.setItem(
      "s3ip:options",
      JSON.stringify({
        version: 2,
        data: newOptions,
      }),
    );
    localStorage.setItem(
      "s3ip:profile:profiles",
      JSON.stringify({ random: "thing" }),
    );
    const { result } = await renderHook(() => useAtom(profilesAtom), {
      wrapper: TestProvider,
    });
    expect(result.current[0].list[0][1]).toEqual(newOptions);
  });
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
