type Size = [number, number];
export const useMasonry = (
  originSizes: Ref<Size[]>,
  wrapperWidth: Ref<number>,
  options: {
    defaultSize: Size;
    gap: number;
  },
) => {
  const { defaultSize, gap } = options;
  const outputSize = ref<Size[]>(Array.from(originSizes.value));
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
      outputSize.value = grouped.flat();
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
