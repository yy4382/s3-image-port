import { z } from "zod";
type Size = [number, number];
export const useMasonry = (
  originSizes: Ref<Size[]>,
  wrapperWidth: Ref<number>,
  options: {
    defaultSize: Size;
    gap: number;
    maxItems?: number;
  },
): Ref<Size[]> => {
  const { defaultSize, gap, maxItems } = options;
  const outputSize = ref<Size[]>(
    // init with defaultSize, and fill to maxItems if defined
    maxItems !== undefined
      ? Array.from({ length: maxItems }, () => defaultSize)
      : Array.from(originSizes.value),
  );
  watch(
    [originSizes, wrapperWidth],
    ([nINS, nWrapperWidth]) => {
      if (!nINS || !nWrapperWidth) return;
      // first, convert all images to have the same height as defaultSize
      const withSameHeight: [number, number][] = nINS.map(([width, height]) => {
        const ratio = width / height;
        return [defaultSize[1] * ratio, defaultSize[1]];
      });

      // then, every line should be an subArray of `grouped` Array
      // find the first n elements remained to be processed that can fit in the wrapper,
      // and scale them up to fit the wrapper width
      const grouped: [number, number][][] = [];
      let curWidth = 0;
      let curGroup: [number, number][] = [];
      withSameHeight.forEach((size) => {
        if (curWidth + size[0] + gap > nWrapperWidth) {
          // this element will be put in the next line
          // scale & push the current line
          scaleCurGroup(curGroup, nWrapperWidth, gap);
          grouped.push(curGroup);
          // start a new line (reset cur* variables)
          curWidth = 0;
          curGroup = [];
        }
        curWidth += size[0] + gap;
        curGroup.push(size);
      });
      if (curGroup.length > 1)
        // if there is only one element in the last line, no need to scale
        scaleCurGroup(curGroup, nWrapperWidth, gap);
      grouped.push(curGroup);

      // finally, flatten the grouped array to outputSize
      outputSize.value = z
        .tuple([z.number(), z.number()])
        .array()
        .parse(grouped.flat());

      // fill to maxItems if needed
      if (maxItems !== undefined && outputSize.value.length < maxItems) {
        // avoid error when routed from a page with 10 items to a page with 15 items
        debug("filling");
        outputSize.value = [
          ...outputSize.value,
          ...Array.from(
            { length: maxItems - outputSize.value.length },
            () => defaultSize,
          ),
        ];
      }
      debug("layout updated");
    },
    { deep: true },
  );
  return outputSize;
};

/**
 * Scales the current group of image dimensions based on the wrapper width and gap.
 * @param curGroup - The current group of image dimensions.
 * @param wrapperWidth - The width of the wrapper element.
 * @param gap - The gap between images.
 */
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
