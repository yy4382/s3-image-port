import { atomWithStorage } from "jotai/utils";
import { describe, test, expect, beforeEach } from "vitest";
import { atomWithStorageMigration } from "./atomWithStorageMigration";
import { renderHook, act } from "@testing-library/react";
import { useAtom, useSetAtom } from "jotai";
import type { SyncStorage } from "jotai/vanilla/utils/atomWithStorage";

const rawStorage = new Map<string, string>();

const storage: SyncStorage<unknown> = {
  getItem: (key: string, initialValue: unknown) =>
    JSON.parse(rawStorage.get(key) ?? JSON.stringify(initialValue)),
  setItem: (key: string, value: unknown) =>
    rawStorage.set(key, JSON.stringify(value)),
  removeItem: (key: string) => rawStorage.delete(key),
};

beforeEach(() => {
  rawStorage.clear();
});

describe("atomWithStorageMigration normal usage", () => {
  test("should load and store an atom", () => {
    const [atom] = atomWithStorageMigration("test1", "tt", storage, {
      version: 1,
      migrate: (_, __, init) => init,
    });

    const { result } = renderHook(() => useAtom(atom));
    expect(result.current[0]).toBe("tt");

    act(() => {
      result.current[1]("new value");
    });
    expect(result.current[0]).toBe("new value");
  });
  test("should migrate", () => {
    const [atom] = atomWithStorageMigration(
      "test2",
      {
        a: "a",
        b: "b",
      },
      storage,
      {
        version: 1,
        migrate: (_, __, i) => i,
      },
    );
    const { result: result1 } = renderHook(() => useAtom(atom));
    expect(result1.current[0]).toEqual({ a: "a", b: "b" });
    act(() => {
      result1.current[1]({ a: "a", b: "bb" });
    });

    const [atom2] = atomWithStorageMigration(
      "test2",
      {
        a: "a",
        c: "k",
      },
      storage,
      {
        version: 2,
        migrate: (stored, oldVersion, initialValue) => {
          if (oldVersion === 1) {
            // @ts-expect-error - stored is not typed
            const newObj = { ...stored, c: stored.b };
            delete newObj.b;
            return newObj;
          }
          return initialValue;
        },
      },
    );
    const { result: result2 } = renderHook(() => useAtom(atom2));
    expect(result2.current[0]).toEqual({ a: "a", c: "bb" });
  });
});

describe("atomWithStorageMigration with outer storage", () => {
  test("should migrate3", () => {
    storage.setItem("config", {
      version: 1,
      data: {
        v1: "data",
      },
    });
    storage.setItem("profile", {
      config: {
        version: 1,
        data: {
          v1: "data",
        },
      },
    });
    const [configAtom, configWithVersionAtom, deepEqualWithAtom] =
      atomWithStorageMigration(
        "config",
        {
          v2: "data",
        },
        storage,
        {
          version: 2,
          migrate: (stored, oldVersion, initialValue) => {
            if (oldVersion === 1) {
              return {
                // @ts-expect-error - stored is not typed
                v2: stored.v1,
              };
            }
            return initialValue;
          },
        },
      );
    const profileAtom = atomWithStorage("profile", {}, storage);

    const { result } = renderHook(() => {
      const [config, setConfig] = useAtom(configAtom);
      const [configWithVersion, setConfigWithVersion] = useAtom(
        configWithVersionAtom,
      );
      const [profile, setProfile] = useAtom(profileAtom);
      const deepEqualWith = useSetAtom(deepEqualWithAtom);
      return {
        config,
        setConfig,
        configWithVersion,
        setConfigWithVersion,
        profile,
        setProfile,
        deepEqualWith,
      };
    });
    expect(result.current.configWithVersion.version).toBe(2);
    expect(result.current.configWithVersion.data).toEqual({ v2: "data" });
    // @ts-expect-error - profile is not typed
    expect(result.current.deepEqualWith(result.current.profile.config)).toBe(
      true,
    );
    act(() => {
      result.current.setConfig({ v2: "abc" });
    });
    expect(result.current.config.v2).toBe("abc");
    act(() => {
      // @ts-expect-error - profile is not typed
      result.current.setConfigWithVersion(result.current.profile.config);
    });
    expect(result.current.configWithVersion.data).toEqual({ v2: "data" });
  });
});
