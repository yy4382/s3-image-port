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
    maxItems !== undefined
      ? Array.from({ length: maxItems }, () => defaultSize)
      : Array.from(originSizes.value),
  );
  watch(
    [originSizes, wrapperWidth],
    ([nINS, nWrapperWidth]) => {
      if (!nINS || !nWrapperWidth) return;
      const withSameHeight: [number, number][] = nINS.map(([width, height]) => {
        const ratio = width / height;
        return [defaultSize[1] * ratio, defaultSize[1]];
      });
      const grouped: [number, number][][] = [];
      let curWidth = 0;
      let curGroup: [number, number][] = [];
      withSameHeight.forEach((size) => {
        if (curWidth + size[0] + gap > nWrapperWidth) {
          curWidth = 0;
          computeCurGroup(curGroup, nWrapperWidth, gap);
          grouped.push(curGroup);
          curGroup = [];
        }
        curWidth += size[0] + gap;
        curGroup.push(size);
      });
      if (curGroup.length > 1) computeCurGroup(curGroup, nWrapperWidth, gap);
      grouped.push(curGroup);
      outputSize.value = z
        .tuple([z.number(), z.number()])
        .array()
        .parse(grouped.flat());
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

const computeCurGroup = (
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
