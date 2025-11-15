import { beforeEach, describe, expect, it } from "vitest";
import {
  getDefaultOptions,
  optionsAtom,
  profilesAtom,
  settingsForSyncAtom,
} from "./settings-store";
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

describe("settingsForSyncAtom", () => {
  it("should remove current field when reading", async () => {
    const { result } = await renderHook(() => useAtom(settingsForSyncAtom), {
      wrapper: TestProvider,
    });

    const syncData = result.current[0];
    expect(syncData.data).not.toHaveProperty("current");
    expect(syncData.data).toHaveProperty("list");
    expect(syncData).toHaveProperty("version");
  });

  it("should restore current field when setting with same profile name", async () => {
    const { result, act } = await renderHook(
      () => ({
        profiles: useAtom(profilesAtom),
        sync: useAtom(settingsForSyncAtom),
      }),
      { wrapper: TestProvider },
    );

    // Set up initial profiles with a specific current selection
    await act(() => {
      result.current.profiles[1]({
        current: 2,
        list: [
          ["Profile A", getDefaultOptions()],
          [
            "Profile B",
            produce(getDefaultOptions(), (draft) => {
              draft.s3.bucket = "bucket-b";
            }),
          ],
          [
            "Profile C",
            produce(getDefaultOptions(), (draft) => {
              draft.s3.bucket = "bucket-c";
            }),
          ],
        ],
      });
    });

    // Update sync data with reordered profiles but same names
    await act(() => {
      result.current.sync[1]({
        version: 3,
        data: {
          list: [
            [
              "Profile C",
              produce(getDefaultOptions(), (draft) => {
                draft.s3.bucket = "bucket-c-updated";
              }),
            ],
            [
              "Profile B",
              produce(getDefaultOptions(), (draft) => {
                draft.s3.bucket = "bucket-b-updated";
              }),
            ],
            ["Profile A", getDefaultOptions()],
          ],
        },
      });
    });

    // Current profile was "Profile B" at index 1, should now be at index 1 (new position)
    expect(result.current.profiles[0].current).toBe(0);
    expect(result.current.profiles[0].list[0][0]).toBe("Profile C");
    expect(result.current.profiles[0].list[0][1].s3.bucket).toBe(
      "bucket-c-updated",
    );
  });

  it("should use current index when profile name is not found", async () => {
    const { result, act } = await renderHook(
      () => ({
        profiles: useAtom(profilesAtom),
        sync: useAtom(settingsForSyncAtom),
      }),
      { wrapper: TestProvider },
    );

    // Set up initial profiles
    await act(() => {
      result.current.profiles[1]({
        current: 1,
        list: [
          ["Profile A", getDefaultOptions()],
          ["Profile B", getDefaultOptions()],
          ["Profile C", getDefaultOptions()],
        ] as [
          string,
          typeof getDefaultOptions extends () => infer T ? T : never,
        ][],
      });
    });

    // Update with completely different profile names
    await act(() => {
      result.current.sync[1]({
        version: 3,
        data: {
          list: [
            ["Profile X", getDefaultOptions()],
            [
              "Profile Y",
              produce(getDefaultOptions(), (draft) => {
                draft.s3.bucket = "bucket-y";
              }),
            ],
            ["Profile Z", getDefaultOptions()],
          ] as [
            string,
            typeof getDefaultOptions extends () => infer T ? T : never,
          ][],
        },
      });
    });

    // Should fallback to using index 1 since "Profile B" doesn't exist
    expect(result.current.profiles[0].current).toBe(1);
    expect(result.current.profiles[0].list[1][0]).toBe("Profile Y");
  });

  it("should default to index 0 when current index is out of bounds", async () => {
    const { result, act } = await renderHook(
      () => ({
        profiles: useAtom(profilesAtom),
        sync: useAtom(settingsForSyncAtom),
      }),
      { wrapper: TestProvider },
    );

    // Set up with 3 profiles, current at index 2
    await act(() => {
      result.current.profiles[1]({
        current: 2,
        list: [
          ["Profile A", getDefaultOptions()],
          ["Profile B", getDefaultOptions()],
          ["Profile C", getDefaultOptions()],
        ],
      });
    });

    // Update with only 2 profiles (different names)
    await act(() => {
      result.current.sync[1]({
        version: 3,
        data: {
          list: [
            ["Profile X", getDefaultOptions()],
            ["Profile Y", getDefaultOptions()],
          ],
        },
      });
    });

    // Should default to 0 since index 2 is out of bounds
    expect(result.current.profiles[0].current).toBe(0);
    expect(result.current.profiles[0].list.length).toBe(2);
  });

  it("should handle function updates correctly", async () => {
    const { result, act } = await renderHook(
      () => ({
        profiles: useAtom(profilesAtom),
        sync: useAtom(settingsForSyncAtom),
      }),
      { wrapper: TestProvider },
    );

    await act(() => {
      result.current.profiles[1]({
        current: 0,
        list: [
          [
            "Profile A",
            produce(getDefaultOptions(), (draft) => {
              draft.s3.bucket = "original-bucket";
            }),
          ],
        ] as [
          string,
          typeof getDefaultOptions extends () => infer T ? T : never,
        ][],
      });
    });

    // Update using function
    await act(() => {
      result.current.sync[1]((prev) => ({
        ...prev,
        data: {
          list: [
            [
              "Profile A",
              produce(getDefaultOptions(), (draft) => {
                draft.s3.bucket = "updated-bucket";
              }),
            ],
          ] as [
            string,
            typeof getDefaultOptions extends () => infer T ? T : never,
          ][],
        },
      }));
    });

    expect(result.current.profiles[0].current).toBe(0);
    expect(result.current.profiles[0].list[0][1].s3.bucket).toBe(
      "updated-bucket",
    );
  });

  it("should preserve current profile through round-trip transformation", async () => {
    const { result, act } = await renderHook(
      () => ({
        profiles: useAtom(profilesAtom),
        sync: useAtom(settingsForSyncAtom),
      }),
      { wrapper: TestProvider },
    );

    await act(() => {
      result.current.profiles[1]({
        current: 2,
        list: [
          ["Profile A", getDefaultOptions()],
          ["Profile B", getDefaultOptions()],
          [
            "Profile C",
            produce(getDefaultOptions(), (draft) => {
              draft.s3.bucket = "bucket-c";
            }),
          ],
        ] as [
          string,
          typeof getDefaultOptions extends () => infer T ? T : never,
        ][],
      });
    });

    // Read, then write back the same data
    const syncData = result.current.sync[0];
    await act(() => {
      result.current.sync[1](syncData);
    });

    // Should maintain current index and profile
    expect(result.current.profiles[0].current).toBe(2);
    expect(result.current.profiles[0].list[2][0]).toBe("Profile C");
    expect(result.current.profiles[0].list[2][1].s3.bucket).toBe("bucket-c");
  });
});
