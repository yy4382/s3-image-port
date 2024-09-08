import { defineStore, acceptHMRUpdate } from "pinia";

const defaultImageSize: [number, number] = [384, 208];
const gap = 8;

export const useMasonryStateStore = defineStore("masonryState", () => {
  const galleryState = useGalleryStateStore();
  const imagePerPage = ref<number>(16);
  const wrapperWidth = ref<number>(0);
  // key -> index, managed by the parent component
  const keyList = computed(() =>
    galleryState.imageDisplayed.map((photo) => photo.Key),
  );
  const keyPlaceMap = computed(() => {
    const map = new Map<string, number>();
    for (const [index, key] of keyList.value.entries()) {
      map.set(key, index);
    }
    return map;
  });

  const naturalSizes = ref<[number, number][]>([]);

  const setNaturalSize = async (key: string, size?: [number, number]) => {
    let index = keyPlaceMap.value.get(key);
    if (index === undefined) {
      await nextTick();
      index = keyPlaceMap.value.get(key);
    }
    if (index === undefined) {
      console.error("Failed to set natural size for key", key);
      return;
    }
    naturalSizes.value[index] = size ?? defaultImageSize;
  };
  const resetNaturalSizes = () => {
    naturalSizes.value = Array(keyList.value.length).fill(defaultImageSize);
  };

  watch(
    keyList,
    () => {
      resetNaturalSizes();
    },
    { immediate: true, deep: true },
  );

  const imageSizesByPlace = useMasonry(naturalSizes, wrapperWidth, {
    gap,
    defaultSize: defaultImageSize,
    maxItems: imagePerPage,
  });

  const imageSizes = computed(() => {
    const map = new Map<string, [number, number]>();
    imageSizesByPlace.value.map((size, index) => {
      map.set(keyList.value[index]!, size);
    });
    return map;
  });

  return {
    imagePerPage,
    wrapperWidth,

    setNaturalSize,
    resetNaturalSizes,

    imageSizes, // readonly
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useMasonryStateStore, import.meta.hot),
  );
}
