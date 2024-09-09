<script lang="ts" setup>
const props = defineProps<{
  s3Key: string;
}>();
const key = toRefs(props).s3Key;

const state = ref<"loading" | "loaded" | "error">("loading");

// load the image and tell natural size to masonry
const imageTag = useTemplateRef("imageTag");
const naturalSize = ref<[number, number] | undefined>(undefined);
const masonryState = useMasonryStateStore();

onMounted(() => {
  if (imageTag.value?.complete) {
    // If the image is already loaded, call onImageLoad directly
    onImageLoad();
  }
});

function onImageLoad() {
  if (!imageTag.value) return;
  const { naturalWidth, naturalHeight } = imageTag.value;
  naturalSize.value = [naturalWidth, naturalHeight];
}
function onImageError() {
  state.value = "error";
}

// show image when wrapper has the same ratio as the image
// (masonry has completed calculation)
const wrapper = useTemplateRef("wrapper");
watchEffect(() => {
  masonryState.setNaturalSize(key.value, naturalSize.value);
});

const wrapperSize = ref<[number, number] | undefined>(undefined);
useResizeObserver(wrapper, (entries) => {
  const entry = entries[0];
  if (!entry) return;
  const { width: entryWidth, height: entryHeight } = entry.contentRect;
  wrapperSize.value = [entryWidth, entryHeight];
});
watchEffect(() => {
  if (
    wrapperSize.value &&
    naturalSize.value &&
    Math.abs(
      wrapperSize.value[0] / wrapperSize.value[1] -
        naturalSize.value[0] / naturalSize.value[1],
    ) < 0.001
  ) {
    setTimeout(() => {
      state.value = "loaded";
    }, 50);
  }
});

const imageLoaded = computed(() => state.value == "loaded");
defineExpose({ imageLoaded });
</script>

<template>
  <div
    ref="wrapper"
    class="transition-all overflow-hidden"
    :style="{
      width: `${masonryState.imageSizes.get(key)![0]}px`,
      height: `${masonryState.imageSizes.get(key)![1]}px`,
    }"
  >
    <PhotoCardImageDisplayError v-if="state == 'error'" :s3-key="key" />
    <USkeleton
      v-if="state == 'loading'"
      class="size-full"
      :ui="{ rounded: 'rounded-none' }"
    />
    <div v-show="state == 'loaded'" class="bg-gray-200">
      <img
        ref="imageTag"
        :src="key2Url(key, useSettingsStore().s3)"
        class="size-full transition-all"
        @load="onImageLoad"
        @error="onImageError"
      />
    </div>
  </div>
</template>
