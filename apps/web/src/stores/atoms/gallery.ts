import { atom } from "jotai";
import { Photo } from "../schemas/photo";
import { atomWithStorage } from "jotai/utils";
import {
  galleryFilterDefault,
  type GalleryFilterOptions,
} from "../schemas/gallery/filter";
import { clearNaturalSizeCacheAtom } from "./photo-size";

export const photosAtom = atomWithStorage<Photo[]>("s3ip:gallery:photos", []);
export const selectedPhotosAtom = atom<Set<string>>(new Set<string>());
export const displayOptionsAtom =
  atom<GalleryFilterOptions>(galleryFilterDefault);
export const currentPageAtom = atom(1);

export const galleryDirtyStatusAtom = atom(false);
export const setGalleryDirtyAtom = atom(null, (_, set) => {
  set(galleryDirtyStatusAtom, true);
});

// used when changing profiles
export const resetGalleryStateAtom = atom(null, (_get, set) => {
  set(photosAtom, []);
  set(selectedPhotosAtom, new Set<string>());
  set(displayOptionsAtom, galleryFilterDefault); // Reset display options
  set(currentPageAtom, 1);
  set(clearNaturalSizeCacheAtom);
  set(galleryDirtyStatusAtom, true); // gallery is always dirty after reset to trigger a refresh
});
