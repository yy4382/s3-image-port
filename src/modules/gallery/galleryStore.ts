import type { Photo } from "@/lib/utils/ImageS3Client";
import { atomWithStorage } from "jotai/utils";
import z from "zod/v4";
import {
  compareAsc,
  compareDesc,
  isAfter,
  isBefore,
  type Duration,
} from "date-fns";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { validS3SettingsAtom } from "../settings/settingsStore";
import { useCallback } from "react";
import { toast } from "sonner";
import ImageS3Client from "@/lib/utils/ImageS3Client";
import {
  displayOptionsDefault,
  getTimeRange,
} from "./GalleryControl/displayControlStore";
import { displayOptionsAtom } from "./GalleryControl/displayControlStore";
import { useTranslations } from "next-intl";
import { enableMapSet } from "immer";

enableMapSet();

export function timeRangesGetter(): { duration: Duration; type: string }[] {
  return [
    {
      duration: { days: 7 },
      type: "7d",
    },
    {
      duration: { days: 14 },
      type: "14d",
    },
    {
      duration: { days: 30 },
      type: "30d",
    },
    {
      duration: { months: 3 },
      type: "3m",
    },
    {
      duration: { months: 6 },
      type: "6m",
    },
    {
      duration: { years: 1 },
      type: "1y",
    },
  ];
}

const photosAtom = atomWithStorage<Photo[]>("s3ip:gallery:photos", []);

export const photosAtomReadOnly = atom((get) => get(photosAtom));

export const availablePrefixesAtom = atom<
  { name: string; hierarchy: number }[]
>((get) => {
  const photos = get(photosAtom);
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
  const photos = get(photosAtom);
  const displayOptions = get(displayOptionsAtom);
  const displayedPhotos = photos
    .filter((photo) => {
      if (
        displayOptions.searchTerm &&
        !photo.Key.includes(displayOptions.searchTerm)
      ) {
        return false;
      }
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

export const PER_PAGE = 12;
export const currentPageAtom = atom(1);

export const showingPhotosAtom = atom<Photo[]>((get) => {
  const start = (get(currentPageAtom) - 1) * PER_PAGE;
  const end = start + PER_PAGE;
  return get(filteredPhotosAtom).slice(start, end);
});

export const containerWidthAtom = atom(600);
export const DEFAULT_IMAGE_SIZE: [number, number] = [384, 208];
const GAP_PX = 8;

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

const naturalSizesAtom = atomWithStorage<Map<string, [number, number]>>(
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

const scaleCurGroup = (
  curGroup: [number, number][],
  wrapperWidth: number,
  gap: number,
) => {
  const widthWithoutGap = wrapperWidth - gap * (curGroup.length - 1);
  const scale =
    widthWithoutGap / curGroup.reduce((acc, [width]) => acc + width, 0);
  curGroup.forEach(([width, height], index) => {
    curGroup[index] = [width * scale, height * scale];
  });
};

export const photoSizeAtom = atom((get) => {
  // debugger;
  const originalSizes = get(showingPhotosAtom).map((photo) => {
    const size = get(naturalSizesAtom).get(photo.Key);
    if (size) {
      const ratio = size[0] / size[1];
      return [DEFAULT_IMAGE_SIZE[1] * ratio, DEFAULT_IMAGE_SIZE[1]] as [
        number,
        number,
      ];
    }
    return DEFAULT_IMAGE_SIZE;
  });

  const grouped: [number, number][][] = [];
  let curWidth = 0;
  let curGroup: [number, number][] = [];
  originalSizes.forEach((size) => {
    if (curWidth + size[0] + GAP_PX > get(containerWidthAtom)) {
      // this element will be put in the next line
      // scale & push the current line
      scaleCurGroup(curGroup, get(containerWidthAtom), GAP_PX);
      grouped.push(curGroup);
      // start a new line (reset cur* variables)
      curWidth = 0;
      curGroup = [];
    }
    curWidth += size[0] + GAP_PX;
    curGroup.push(size);
  });
  if (curGroup.length > 1)
    // if there is only one element in the last line, no need to scale
    scaleCurGroup(curGroup, get(containerWidthAtom), GAP_PX);
  grouped.push(curGroup);
  return grouped.flat();
});

export const selectedPhotosAtom = atom<Set<string>>(new Set<string>());
export const selectModeAtom = atom((get) => {
  const selected = get(selectedPhotosAtom);
  return selected.size > 0;
});

export const useFetchPhotoList = () => {
  const setPhotos = useSetAtom(photosAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const t = useTranslations("gallery.store");

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
        photos = await new ImageS3Client(s3Settings).list();
      } catch (error) {
        if (showToast) {
          toast.error(t("failedToFetchPhotos"));
        }
        console.error("Failed to fetch photos", error);
        return;
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
    [s3Settings, setPhotos, t],
  );

  return fetchPhotoList;
};

// used when changing profiles
export const resetGalleryStateAtom = atom(null, (_get, set) => {
  set(photosAtom, []);
  set(selectedPhotosAtom, new Set<string>());
  set(displayOptionsAtom, displayOptionsDefault); // Reset display options
  set(currentPageAtom, 1);
  set(naturalSizesAtom, new Map());
});
