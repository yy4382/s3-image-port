import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { z } from "zod";
import { showingPhotosAtom } from "./use-photo-list";

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
export const resetNaturalSizesAtom = atom(null, (_, set) => {
  set(naturalSizesAtom, new Map());
});

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

export const photoSizeAtom = atom<
  {
    size: { width: number; height: number };
    position: { x: number; y: number };
  }[]
>((get) => {
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

  const processedPhotos: {
    size: { width: number; height: number };
    position: { x: number; y: number };
  }[] = [];
  let curWidth = 0;
  let curGroup: [number, number][] = [];
  let yOffset = 0;

  originalSizes.forEach((size, index) => {
    if (
      curWidth + size[0] + (curGroup.length > 0 ? GAP_PX : 0) >
        get(containerWidthAtom) &&
      curGroup.length > 0
    ) {
      // This element will be put in the next line
      // Scale & process the current line
      scaleCurGroup(curGroup, get(containerWidthAtom), GAP_PX);
      let xOffset = 0;
      let maxRowHeight = 0;
      curGroup.forEach((scaledSize) => {
        processedPhotos.push({
          size: { width: scaledSize[0], height: scaledSize[1] },
          position: { x: xOffset, y: yOffset },
        });
        xOffset += scaledSize[0] + GAP_PX;
        if (scaledSize[1] > maxRowHeight) {
          maxRowHeight = scaledSize[1];
        }
      });
      yOffset += maxRowHeight + GAP_PX;
      // Start a new line (reset cur* variables)
      curWidth = 0;
      curGroup = [];
    }
    curWidth += size[0] + (curGroup.length > 0 ? GAP_PX : 0);
    curGroup.push(size);

    // If this is the last element, process the remaining group
    if (index === originalSizes.length - 1) {
      if (curGroup.length > 0) {
        // if there is only one element in the last line, no need to scale, unless it's wider than container
        if (
          curGroup.length > 1 ||
          (curGroup.length === 1 && curGroup[0][0] > get(containerWidthAtom))
        ) {
          scaleCurGroup(curGroup, get(containerWidthAtom), GAP_PX);
        }
        let xOffset = 0;
        let maxRowHeight = 0;
        curGroup.forEach((scaledSize) => {
          processedPhotos.push({
            size: { width: scaledSize[0], height: scaledSize[1] },
            position: { x: xOffset, y: yOffset },
          });
          xOffset += scaledSize[0] + GAP_PX;
          if (scaledSize[1] > maxRowHeight) {
            maxRowHeight = scaledSize[1];
          }
        });
        // No yOffset increment for the last line's items themselves, only after the row is complete
      }
    }
  });

  return processedPhotos;
});
