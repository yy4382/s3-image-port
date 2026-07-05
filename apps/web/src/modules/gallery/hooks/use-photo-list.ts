import {
  createImageStorage,
  createS3ImageStorageAdapter,
  type ImageStorage,
  type StoredImage,
} from "@/modules/image-storage";
import { compareAsc, compareDesc, isAfter, isBefore } from "date-fns";
import Fuse from "fuse.js";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { validS3SettingsAtom } from "@/stores/atoms/settings";
import type { S3Options } from "@/stores/schemas/settings";
import { getTimeRange } from "./use-display-control";
import {
  currentPageAtom,
  pageSizeAtom,
  photosAtom,
  displayOptionsAtom,
  galleryDirtyStatusAtom,
} from "@/stores/atoms/gallery";

export const photosAtomReadOnly = atom((get) => get(photosAtom));

export const availablePrefixesAtom = atom<
  { name: string; hierarchy: number }[]
>((get) => {
  const photos = get(photosAtomReadOnly);
  const prefixes = new Set(
    photos.flatMap((photo) => {
      const parts = photo.key.split("/");
      return parts
        .slice(0, -1)
        .map((_, index) => parts.slice(0, index + 1).join("/"));
    }),
  );
  return [...Array.from(prefixes), ""]
    .map((prefix) => {
      const hierarchy = prefix.split("/").length - 1;
      return { name: prefix, hierarchy };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
});

export const filteredPhotosAtom = atom<StoredImage[]>((get) => {
  const photos = get(photosAtomReadOnly);
  const displayOptions = get(displayOptionsAtom);

  const searchedPhotos = displayOptions.searchTerm
    ? new Fuse(photos, {
        keys: ["key"],
        threshold: 0.3,
      })
        .search(displayOptions.searchTerm)
        .map((result) => result.item)
    : photos;

  const displayedPhotos = searchedPhotos
    .filter((photo) => {
      if (
        displayOptions.prefix !== undefined &&
        !photo.key.startsWith(displayOptions.prefix)
      ) {
        return false;
      }
      if (displayOptions.prefix === "" && photo.key.includes("/")) {
        return false;
      }
      const [from, to] = getTimeRange(displayOptions.dateRangeType);
      if (from && (!photo.lastModified || isBefore(photo.lastModified, from))) {
        return false;
      }
      if (to && (!photo.lastModified || isAfter(photo.lastModified, to))) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (displayOptions.searchTerm) {
        return 0; // Fuse.js already sorted by relevance
      }
      if (displayOptions.sortBy === "key") {
        return displayOptions.sortOrder === "asc"
          ? a.key.localeCompare(b.key)
          : b.key.localeCompare(a.key);
      } else {
        return displayOptions.sortOrder === "asc"
          ? compareAsc(a.lastModified ?? "", b.lastModified ?? "")
          : compareDesc(a.lastModified ?? "", b.lastModified ?? "");
      }
    });
  return displayedPhotos;
});

export const filteredPhotosCountAtom = atom((get) => {
  return get(filteredPhotosAtom).length;
});

export const showingPhotosAtom = atom<StoredImage[]>((get) => {
  const pageSize = get(pageSizeAtom);
  const start = (get(currentPageAtom) - 1) * pageSize;
  const end = start + pageSize;
  return get(filteredPhotosAtom).slice(start, end);
});

type CreateGalleryImageStorage = (settings: S3Options) => ImageStorage;

const createGalleryImageStorage: CreateGalleryImageStorage = (settings) =>
  createImageStorage(createS3ImageStorageAdapter(settings));

export const useFetchPhotoList = (
  createStorage: CreateGalleryImageStorage = createGalleryImageStorage,
) => {
  const setPhotos = useSetAtom(photosAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const t = useTranslations("gallery.store");
  const setGalleryDirty = useSetAtom(galleryDirtyStatusAtom);

  const [status, setStatus] = useState<"idle" | "loading">("idle");

  const fetchPhotoList = useCallback(
    async (
      {
        toastLevel = "info",
      }: {
        toastLevel: "info" | "error" | "silent";
      } = { toastLevel: "info" },
    ) => {
      if (!s3Settings) {
        if (toastLevel !== "silent") {
          toast.error(t("s3SettingsNotFound"));
        }
        console.error("S3 settings not found");
        return;
      }
      let photos: StoredImage[];
      try {
        setStatus("loading");
        const storage = createStorage(s3Settings);
        const result = await storage.listStoredImages();
        if (!result.ok) {
          if (toastLevel !== "silent") {
            toast.error(t("failedToFetchPhotos"));
          }
          console.error("Failed to fetch photos", result.error);
          return;
        }
        photos = result.value;
        setGalleryDirty(false);
      } catch (error) {
        if (toastLevel !== "silent") {
          toast.error(t("failedToFetchPhotos"));
        }
        console.error("Failed to fetch photos", error);
        return;
      } finally {
        setStatus("idle");
      }
      if (photos) {
        if (toastLevel !== "silent" && toastLevel !== "error") {
          toast.message(t("fetchedPhotos"));
        }
        console.log("Fetched photos", photos.length);
        setPhotos(photos);
      } else {
        if (toastLevel !== "silent") {
          toast.error(t("failedToFetchPhotos"));
        }
        console.error("Failed to fetch photos");
      }
    },
    [s3Settings, setPhotos, t, setGalleryDirty, createStorage],
  );

  const isLoading = status === "loading";

  return { fetchPhotoList, status, isLoading };
};
