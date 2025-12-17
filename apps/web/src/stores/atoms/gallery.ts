import { atom } from "jotai";
import { Photo } from "../schemas/photo";
import { atomWithStorage } from "jotai/utils";
import {
  galleryFilterDefault,
  type GalleryFilterOptions,
} from "../schemas/gallery/filter";
import { z } from "zod";

export const photosAtom = atomWithStorage<Photo[]>("s3ip:gallery:photos", []);
export const selectedPhotosAtom = atom<Set<string>>(new Set<string>());
export const displayOptionsAtom =
  atom<GalleryFilterOptions>(galleryFilterDefault);
export const currentPageAtom = atom(1);

type SampleMapItem = [number, number];
const serializeMap = (map: Map<string, SampleMapItem>) =>
  JSON.stringify(Array.from(map.entries()));
function deserializeMap(str: string) {
  try {
    return new Map(JSON.parse(str)) as Map<string, SampleMapItem>;
  } catch (error) {
    console.error("Failed to deserialize map", error);
    return new Map<string, SampleMapItem>();
  }
}
type SampleMap = Map<string, SampleMapItem>;
const localStorageWithMap = {
  getItem: (key: string, initialValue: SampleMap) => {
    const item = localStorage.getItem(key);
    return item ? deserializeMap(item) : initialValue;
  },
  setItem: (key: string, newValue: SampleMap) => {
    localStorage.setItem(key, serializeMap(newValue));
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
  },
};
export const naturalSizesAtom = atomWithStorage<Map<string, [number, number]>>(
  "s3ip:gallery:naturalSizeCache",
  new Map(),
  localStorageWithMap,
);

export const setNaturalSizesAtom = atom(
  null,
  (get, set, inputAction: [string, [number, number]]) => {
    const validated = z
      .tuple([z.string(), z.tuple([z.number(), z.number()])])
      .safeParse(inputAction);
    if (!validated.success) {
      return;
    }
    const action = validated.data;
    const map = get(naturalSizesAtom);
    const old = map.get(action[0]);
    if (old && old[0] === action[1][0] && old[1] === action[1][1]) {
      return;
    }
    map.set(action[0], action[1]);
    set(naturalSizesAtom, new Map(map));
  },
);

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
  set(naturalSizesAtom, new Map());
  set(galleryDirtyStatusAtom, true); // gallery is always dirty after reset to trigger a refresh
});
