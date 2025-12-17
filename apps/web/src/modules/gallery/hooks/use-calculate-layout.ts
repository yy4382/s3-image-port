import { atom } from "jotai";
import { showingPhotosAtom } from "./use-photo-list";
import { naturalSizesAtom } from "@/stores/atoms/gallery";
export { setNaturalSizesAtom } from "@/stores/atoms/gallery";

export const containerWidthAtom = atom(600);
export const DEFAULT_IMAGE_SIZE: [number, number] = [384, 208];
const GAP_PX = 8;

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
