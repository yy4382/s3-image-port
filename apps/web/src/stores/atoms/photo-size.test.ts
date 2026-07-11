import { createStore } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { produce } from "immer";

import { replaceSettingsProfileAtom } from "@/modules/settings/replace-profile";
import { getDefaultOptions } from "../schemas/settings";
import {
  clearNaturalSizeCacheAtom,
  naturalSizesAtom,
  setNaturalSizesAtom,
} from "./photo-size";
import { settings } from "./settings";

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  createStore().set(clearNaturalSizeCacheAtom);
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("natural-size cache", () => {
  it("does not rehydrate a stale payload while an unmounted clear is pending", () => {
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    localStorage.setItem(
      "s3ip:gallery:naturalSizeCache",
      JSON.stringify([["i/old-profile.webp", [1200, 800]]]),
    );
    removeItem.mockClear();
    setItem.mockClear();
    const store = createStore();

    store.set(clearNaturalSizeCacheAtom);
    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(removeItem).toHaveBeenCalledWith("s3ip:gallery:naturalSizeCache");
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem("s3ip:gallery:naturalSizeCache")).toBeNull();
    const unsubscribe = store.sub(naturalSizesAtom, () => {});

    expect(store.get(naturalSizesAtom)[0].size).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledWith("s3ip:gallery:naturalSizeCache", "[]");
    expect(
      JSON.parse(
        localStorage.getItem("s3ip:gallery:naturalSizeCache") ?? "null",
      ),
    ).toEqual([]);
    expect(store.get(naturalSizesAtom)[0].size).toBe(0);

    unsubscribe();
  });

  it("falls back from malformed persisted data and keeps its payload format", () => {
    localStorage.setItem("s3ip:gallery:naturalSizeCache", "not json");
    const store = createStore();
    const unsubscribe = store.sub(naturalSizesAtom, () => {});

    expect(store.get(naturalSizesAtom)[0].size).toBe(0);
    store.set(setNaturalSizesAtom, ["i/a.webp", [640, 480]]);
    vi.runOnlyPendingTimers();
    expect(
      JSON.parse(
        localStorage.getItem("s3ip:gallery:naturalSizeCache") ?? "null",
      ),
    ).toEqual([["i/a.webp", [640, 480]]]);

    unsubscribe();
  });

  it("publishes one clear only for a genuine replacement", () => {
    const store = createStore();
    const unsubscribeMount = store.sub(naturalSizesAtom, () => {});
    store.set(clearNaturalSizeCacheAtom);
    store.set(setNaturalSizesAtom, ["i/a.webp", [640, 480]]);
    let notifications = 0;
    const unsubscribe = store.sub(naturalSizesAtom, () => notifications++);

    store.set(settings.storage, {
      type: "update",
      value: (raw) => ({ ...raw, endpoint: "invalid ordinary edit" }),
    });
    store.set(settings.profiles, {
      type: "rename",
      oldName: "Default",
      newName: "Renamed",
    });
    expect(notifications).toBe(0);
    expect(store.get(naturalSizesAtom)[0].get("i/a.webp")).toEqual([640, 480]);

    store.set(settings.profiles, {
      type: "import",
      value: {
        name: "Work",
        data: produce(getDefaultOptions(), (draft) => {
          draft.s3.endpoint = "https://replacement.example.com";
        }),
      },
    });
    expect(
      store.set(replaceSettingsProfileAtom, {
        type: "activate",
        name: "Work",
      }),
    ).toMatchObject({ profileReplaced: true });
    expect(store.get(naturalSizesAtom)[0].size).toBe(0);
    expect(notifications).toBe(1);

    expect(
      store.set(replaceSettingsProfileAtom, {
        type: "activate",
        name: "Work",
      }),
    ).toMatchObject({ profileReplaced: false });
    expect(notifications).toBe(1);

    unsubscribe();
    unsubscribeMount();
  });
});
