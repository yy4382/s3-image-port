import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "vitest-browser-react";
import { Provider, useAtomValue } from "jotai";
import { createStore } from "jotai";
import type { ReactNode } from "react";

import type { StoredImage } from "@/modules/image-storage";
import { createImageStorage } from "@/modules/image-storage";
import { createMemoryImageStorageAdapter } from "@/modules/image-storage/adapters/memory";
import {
  currentPageAtom,
  displayOptionsAtom,
  galleryDirtyStatusAtom,
  pageSizeAtom,
  photosAtom,
} from "@/stores/atoms/gallery";
import { profilesAtom } from "@/stores/atoms/settings";
import { getDefaultOptions, type S3Options } from "@/stores/schemas/settings";
import {
  availablePrefixesAtom,
  filteredPhotosAtom,
  showingPhotosAtom,
  useFetchPhotoList,
} from "./use-photo-list";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock("use-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const validS3Settings: S3Options = {
  endpoint: "https://s3.example.com",
  bucket: "images",
  region: "us-east-1",
  accKeyId: "access-key",
  secretAccKey: "secret-key",
  forcePathStyle: false,
  pubUrl: "https://cdn.example.com",
  includePath: "",
};

const storedImages: StoredImage[] = [
  {
    key: "i/2026/january/alpha.webp",
    url: "https://cdn.example.com/i/2026/january/alpha.webp",
    lastModified: "2026-01-05T10:00:00.000Z",
  },
  {
    key: "i/2026/january/cat.webp",
    url: "https://cdn.example.com/i/2026/january/cat.webp",
    lastModified: "2026-01-03T10:00:00.000Z",
  },
  {
    key: "i/2026/february/beta.webp",
    url: "https://cdn.example.com/i/2026/february/beta.webp",
    lastModified: "2026-02-05T10:00:00.000Z",
  },
  {
    key: "root.webp",
    url: "https://cdn.example.com/root.webp",
    lastModified: "2026-01-10T10:00:00.000Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("gallery stored image listing", () => {
  it("derives prefixes from StoredImage keys", () => {
    const store = createStore();
    store.set(photosAtom, storedImages);

    expect(store.get(availablePrefixesAtom)).toEqual([
      { name: "", hierarchy: 0 },
      { name: "i", hierarchy: 0 },
      { name: "i/2026", hierarchy: 1 },
      { name: "i/2026/february", hierarchy: 2 },
      { name: "i/2026/january", hierarchy: 2 },
    ]);
  });

  it("filters and sorts StoredImage values by search, prefix, and date", () => {
    const store = createStore();
    store.set(photosAtom, storedImages);

    store.set(displayOptionsAtom, {
      searchTerm: "cat",
      prefix: "i/2026/january",
      dateRangeType: [
        new Date("2026-01-01T00:00:00.000Z"),
        new Date("2026-01-31T23:59:59.999Z"),
      ],
      sortBy: "date",
      sortOrder: "asc",
    });

    expect(store.get(filteredPhotosAtom).map((image) => image.key)).toEqual([
      "i/2026/january/cat.webp",
    ]);
  });

  it("paginates StoredImage values after filtering", () => {
    const store = createStore();
    store.set(
      photosAtom,
      Array.from({ length: 21 }, (_, index) => ({
        key: `root-${String(index).padStart(2, "0")}.webp`,
        url: `https://cdn.example.com/root-${String(index).padStart(2, "0")}.webp`,
        lastModified: "2026-01-01T00:00:00.000Z",
      })),
    );
    store.set(displayOptionsAtom, {
      searchTerm: "",
      prefix: undefined,
      dateRangeType: [null, null],
      sortBy: "key",
      sortOrder: "asc",
    });
    store.set(pageSizeAtom, 20);
    store.set(currentPageAtom, 2);

    expect(store.get(showingPhotosAtom).map((image) => image.key)).toEqual([
      "root-20.webp",
    ]);
  });

  it("refreshes gallery state with StoredImage values from image storage", async () => {
    const storage = createImageStorage(
      createMemoryImageStorageAdapter({
        images: [
          {
            key: "i/2026/january/alpha.webp",
            lastModified: "2026-01-05T10:00:00.000Z",
            url: "https://cdn.example.com/i/2026/january/alpha.webp",
          },
        ],
      }),
    );
    const store = createStore();
    store.set(profilesAtom, {
      list: [
        [
          "Test",
          {
            ...getDefaultOptions(),
            s3: validS3Settings,
          },
        ],
      ],
      current: 0,
    });
    store.set(galleryDirtyStatusAtom, true);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result, act } = await renderHook(
      () => ({
        ...useFetchPhotoList(() => storage),
        photos: useAtomValue(photosAtom),
        isDirty: useAtomValue(galleryDirtyStatusAtom),
      }),
      { wrapper },
    );

    await act(async () => {
      await result.current.fetchPhotoList({ toastLevel: "silent" });
    });

    expect(result.current.photos).toEqual([
      {
        key: "i/2026/january/alpha.webp",
        lastModified: "2026-01-05T10:00:00.000Z",
        url: "https://cdn.example.com/i/2026/january/alpha.webp",
      },
    ]);
    expect(result.current.isDirty).toBe(false);
  });
});
