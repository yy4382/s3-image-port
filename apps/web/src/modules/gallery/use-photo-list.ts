import type { Photo } from "@/lib/utils/ImageS3Client";
import ImageS3Client from "@/lib/utils/ImageS3Client";
import { compareAsc, compareDesc, isAfter, isBefore } from "date-fns";
import Fuse from "fuse.js";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { validS3SettingsAtom } from "../settings/settings-store";
import { resetNaturalSizesAtom } from "./use-calculate-layout";
import {
  displayOptionsAtom,
  displayOptionsDefault,
  getTimeRange,
} from "./use-display-control";
import { selectedPhotosAtom } from "./use-select";

const photosAtom = atomWithStorage<Photo[]>("s3ip:gallery:photos", []);
export const photosAtomReadOnly = atom((get) => get(photosAtom));

export const galleryDirtyStatusAtom = atom(false);
export const setGalleryDirtyAtom = atom(null, (_, set) => {
  set(galleryDirtyStatusAtom, true);
});

export const availablePrefixesAtom = atom<
  { name: string; hierarchy: number }[]
>((get) => {
  const photos = get(photosAtomReadOnly);
  const prefixes = new Set(
    photos.flatMap((photo) => {
      const parts = photo.Key.split("/");
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

export const filteredPhotosAtom = atom<Photo[]>((get) => {
  const photos = get(photosAtomReadOnly);
  const displayOptions = get(displayOptionsAtom);

  const searchedPhotos = displayOptions.searchTerm
    ? new Fuse(photos, {
        keys: ["Key"],
        threshold: 0.3,
      })
        .search(displayOptions.searchTerm)
        .map((result) => result.item)
    : photos;

  const displayedPhotos = searchedPhotos
    .filter((photo) => {
      if (
        displayOptions.prefix !== undefined &&
        !photo.Key.startsWith(displayOptions.prefix)
      ) {
        return false;
      }
      if (displayOptions.prefix === "" && photo.Key.includes("/")) {
        return false;
      }
      const [from, to] = getTimeRange(displayOptions.dateRangeType);
      if (from && isBefore(photo.LastModified, from)) {
        return false;
      }
      if (to && isAfter(photo.LastModified, to)) {
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
          ? a.Key.localeCompare(b.Key)
          : b.Key.localeCompare(a.Key);
      } else {
        return displayOptions.sortOrder === "asc"
          ? compareAsc(a.LastModified, b.LastModified)
          : compareDesc(a.LastModified, b.LastModified);
      }
    });
  return displayedPhotos;
});

export const filteredPhotosCountAtom = atom((get) => {
  return get(filteredPhotosAtom).length;
});

export const PER_PAGE = 20;
export const currentPageAtom = atom(1);

export const showingPhotosAtom = atom<Photo[]>((get) => {
  const start = (get(currentPageAtom) - 1) * PER_PAGE;
  const end = start + PER_PAGE;
  return get(filteredPhotosAtom).slice(start, end);
});

export const useFetchPhotoList = () => {
  const setPhotos = useSetAtom(photosAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const t = useTranslations("gallery.store");
  const setGalleryDirty = useSetAtom(galleryDirtyStatusAtom);

  const [status, setStatus] = useState<"idle" | "loading">("idle");

  const fetchPhotoList = useCallback(
    async (showToast = true) => {
      if (!s3Settings) {
        if (showToast) {
          toast.error(t("s3SettingsNotFound"));
        }
        console.error("S3 settings not found");
        return;
      }
      let photos: Photo[];
      try {
        setStatus("loading");
        photos = await new ImageS3Client(s3Settings).list();
        setGalleryDirty(false);
      } catch (error) {
        if (showToast) {
          toast.error(t("failedToFetchPhotos"));
        }
        console.error("Failed to fetch photos", error);
        return;
      } finally {
        setStatus("idle");
      }
      if (photos) {
        if (showToast) {
          toast.message(t("fetchedPhotos"));
        }
        console.log("Fetched photos", photos.length);
        setPhotos(photos);
      } else {
        if (showToast) {
          toast.error(t("failedToFetchPhotos"));
        }
        console.error("Failed to fetch photos");
      }
    },
    [s3Settings, setPhotos, t, setGalleryDirty],
  );

  const isLoading = status === "loading";

  return { fetchPhotoList, status, isLoading };
};

// used when changing profiles
export const resetGalleryStateAtom = atom(null, (_get, set) => {
  set(photosAtom, []);
  set(selectedPhotosAtom, new Set<string>());
  set(displayOptionsAtom, displayOptionsDefault); // Reset display options
  set(currentPageAtom, 1);
  set(resetNaturalSizesAtom);
  set(galleryDirtyStatusAtom, true); // gallery is always dirty after reset to trigger a refresh
});
