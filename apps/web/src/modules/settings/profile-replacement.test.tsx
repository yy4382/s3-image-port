import { act, fireEvent, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { produce } from "immer";
import { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storageCalls = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(async () => ({
    ok: true as const,
    value: [
      {
        key: "i/replacement.webp",
        lastModified: "2026-07-11T00:00:00.000Z",
      },
    ],
  })),
}));

vi.mock(import("@/modules/image-storage"), async (importOriginal) => ({
  ...(await importOriginal()),
  createS3ImageStorage: (options) => {
    storageCalls.create(options);
    return {
      listStoredImages: storageCalls.list,
      putStoredImage: vi.fn(),
      deleteStoredImages: vi.fn(),
      renameStoredImage: vi.fn(),
      downloadStoredImage: vi.fn(),
      probeStoredImage: vi.fn(),
      checkAccess: vi.fn(),
    };
  },
}));

vi.mock(import("@tanstack/react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  Link: (props) => (
    <a href={props.href ?? props.to?.toString() ?? ""}>
      {props.children as ReactNode}
    </a>
  ),
}));

import { render } from "@/../test/utils/render-with-providers";
import { imageCatalog } from "@/modules/image-catalog";
import { profileGenerationAtom } from "@/modules/settings/profile-generation";
import { getDefaultOptions } from "@/stores/schemas/settings";
import {
  clearNaturalSizeCacheAtom,
  naturalSizesAtom,
  setNaturalSizesAtom,
} from "@/stores/atoms/photo-size";
import { settings } from "@/stores/atoms/settings";
import { drainMicrotasks } from "@/test/helpers/deterministic";

import { replaceSettingsProfileAtom } from "./replace-profile";
import { S3Settings } from "./s3/s3";

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  storageCalls.create.mockClear();
  storageCalls.list.mockClear();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("profile-replacement composition", () => {
  it("rebases and clears each owner once, then leaves an ordinary no-op inert", async () => {
    const store = createStore();
    const storageSet = vi.spyOn(Storage.prototype, "setItem");
    const unsubscribeSettings = store.sub(settings.profiles, () => {});
    const unsubscribeCatalog = store.sub(imageCatalog.state, () => {});
    const unsubscribeNatural = store.sub(naturalSizesAtom, () => {});

    store.set(clearNaturalSizeCacheAtom);
    store.set(setNaturalSizesAtom, ["i/old-profile.webp", [1200, 800]]);
    store.set(settings.profiles, {
      type: "import",
      value: {
        name: "Work",
        data: produce(getDefaultOptions(), (draft) => {
          draft.s3 = {
            endpoint: "https://s3.example.com",
            bucket: "images",
            region: "us-east-1",
            accKeyId: "access-key",
            secretAccKey: "secret-key",
            forcePathStyle: false,
            pubUrl: "https://cdn.example.com",
            includePath: "gallery/",
          };
          draft.gallery.autoRefresh = true;
        }),
      },
    });
    vi.advanceTimersByTime(1000);
    await drainMicrotasks();
    storageSet.mockClear();
    storageCalls.create.mockClear();
    storageCalls.list.mockClear();

    let generationChanges = 0;
    let naturalChanges = 0;
    const unsubscribeGeneration = store.sub(profileGenerationAtom, () => {
      generationChanges++;
    });
    const unsubscribeNaturalCount = store.sub(naturalSizesAtom, () => {
      naturalChanges++;
    });

    render(
      <Provider store={store}>
        <S3Settings />
      </Provider>,
    );
    const draftEndpoint = screen.getByLabelText("Endpoint");
    fireEvent.change(draftEndpoint, { target: { value: "invalid draft" } });
    await act(async () => {
      await drainMicrotasks();
    });
    storageSet.mockClear();

    await act(async () => {
      expect(
        store.set(replaceSettingsProfileAtom, {
          type: "activate",
          name: "Work",
        }),
      ).toMatchObject({ status: "applied", profileReplaced: true });
      await drainMicrotasks();
    });
    vi.advanceTimersByTime(1000);
    await drainMicrotasks();

    const replacementEndpoint = screen.getByLabelText("Endpoint");
    expect(replacementEndpoint).not.toBe(draftEndpoint);
    expect(replacementEndpoint.getAttribute("value")).toBe(
      "https://s3.example.com",
    );
    expect(store.get(settings.storage).raw.endpoint).toBe(
      "https://s3.example.com",
    );
    expect(generationChanges).toBe(1);
    expect(naturalChanges).toBe(1);
    expect(store.get(naturalSizesAtom)[0].size).toBe(0);
    expect(storageCalls.create).toHaveBeenCalledTimes(1);
    expect(storageCalls.list).toHaveBeenCalledTimes(1);
    expect(
      storageSet.mock.calls.filter(([key]) => key === "s3ip:profiles-list"),
    ).toHaveLength(1);
    expect(
      storageSet.mock.calls.filter(([key]) => key === "s3ip:gallery:photos"),
    ).toEqual([
      ["s3ip:gallery:photos", "[]"],
      [
        "s3ip:gallery:photos",
        JSON.stringify([
          {
            key: "i/replacement.webp",
            lastModified: "2026-07-11T00:00:00.000Z",
          },
        ]),
      ],
    ]);
    expect(
      storageSet.mock.calls.filter(
        ([key]) => key === "s3ip:gallery:naturalSizeCache",
      ),
    ).toEqual([["s3ip:gallery:naturalSizeCache", "[]"]]);

    fireEvent.change(replacementEndpoint, {
      target: { value: "another invalid draft" },
    });
    await act(async () => {
      await drainMicrotasks();
    });
    const countsAfterReplacement = {
      generationChanges,
      naturalChanges,
      creates: storageCalls.create.mock.calls.length,
      lists: storageCalls.list.mock.calls.length,
      writes: storageSet.mock.calls.length,
    };
    await act(async () => {
      expect(
        store.set(replaceSettingsProfileAtom, {
          type: "activate",
          name: "Work",
        }),
      ).toMatchObject({ status: "already-active", profileReplaced: false });
      await drainMicrotasks();
    });
    vi.advanceTimersByTime(1000);
    await drainMicrotasks();

    expect(screen.getByLabelText("Endpoint")).toBe(replacementEndpoint);
    expect(replacementEndpoint.getAttribute("value")).toBe(
      "another invalid draft",
    );
    expect({
      generationChanges,
      naturalChanges,
      creates: storageCalls.create.mock.calls.length,
      lists: storageCalls.list.mock.calls.length,
      writes: storageSet.mock.calls.length,
    }).toEqual(countsAfterReplacement);

    unsubscribeNaturalCount();
    unsubscribeGeneration();
    unsubscribeNatural();
    unsubscribeCatalog();
    unsubscribeSettings();
    storageSet.mockRestore();
  });
});
