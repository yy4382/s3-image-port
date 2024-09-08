<template>
  <div ref="imageWrapper" class="flex flex-wrap gap-2">
    <PhotoCard
      v-for="photo in currentDisplayed"
      :key="photo.Key"
      :photo="photo"
      :select-mode="galleryState.imageSelected.length > 0"
    />
  </div>
  <UPagination
    v-if="photos.length > 0"
    v-model="page"
    class="mx-auto max-w-fit"
    :total="photos.length"
    :page-count="imagePerPage"
  />
</template>

<script lang="ts" setup>
import type { PhotoCard } from "#components";

const galleryState = useGalleryStateStore();

// MARK: pagination
const photos = computed(() => galleryState.imageFiltered);
const page = ref(1);
const imagePerPage = 16;

const currentDisplayed = computed(() =>
  photos.value.slice(
    (page.value - 1) * imagePerPage,
    page.value * imagePerPage,
  ),
);
watchEffect(() => (galleryState.imageDisplayed = currentDisplayed.value));

// MARK: masonry layout
const masonryState = useMasonryStateStore();
masonryState.imagePerPage = imagePerPage;

const imageWrapper = useTemplateRef("imageWrapper");
const wrapperWidth = useElementSize(imageWrapper).width;
useResizeObserver(imageWrapper, (entries) => {
  const entry = entries[0];
  if (!entry) return;
  const { width } = entry.contentRect;
  wrapperWidth.value = width;
});
const deBouncedWrapperWidth = refDebounced(wrapperWidth, 300);
watchEffect(() => {
  masonryState.wrapperWidth = deBouncedWrapperWidth.value;
});
</script>
