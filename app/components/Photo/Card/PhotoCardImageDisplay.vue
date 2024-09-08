<script lang="ts" setup>
/**
 *  Basic workflow of this component:
 * 1. When mounted, GetObject from S3 and set the ObjectUrl to <img>
 * 2. When <img> is loaded, set the natural size to the masonry state
 * 3. The masonry state will set size for wrapper
 * 4. When wrapper has the same ratio as the image, set showImg to true to show the image
 */
const props = defineProps<{
  s3Key: string;
}>();
const key = toRefs(props).s3Key;

// step 1: get objectUrl
const { imageBlob, isImage, mimeType } = useImageDisplay(key);
const forceShowImage = ref(false);
const shownImageBlob = computed(() => {
  if (forceShowImage.value) return imageBlob.value;
  else if (isImage.value) return imageBlob.value;
  else return undefined;
});
const imageUrl = useObjectUrl(shownImageBlob);

// step 2: update masonry state when image is loaded
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

// step 3: show image when wrapper has the same ratio as the image
// (masonry has completed calculation)
const wrapper = useTemplateRef("wrapper");
const imageLoaded = ref(false);
watchEffect(() => {
  masonryState.setNaturalSize(key.value, naturalSize.value);
});

useResizeObserver(wrapper, (entries) => {
  const entry = entries[0];
  if (!entry) return;
  const { width: entryWidth, height: entryHeight } = entry.contentRect;
  if (
    naturalSize.value &&
    Math.abs(
      entryWidth / entryHeight - naturalSize.value[0] / naturalSize.value[1],
    ) < 0.001
  ) {
    setTimeout(() => {
      imageLoaded.value = true;
    }, 50);
  }
});

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
    <div v-show="!imageLoaded" class="size-full">
      <div
        v-if="!isImage && isImage !== null && !forceShowImage"
        class="size-full flex items-center justify-center border-2 dark:border-gray-700"
      >
        <div class="flex flex-col items-center justify-center gap-2">
          <p>This may not be an image</p>
          <p class="text-xs">Mime: {{ mimeType }}</p>
          <UButton @click="forceShowImage = true">Show</UButton>
        </div>
      </div>
      <USkeleton v-else class="size-full" :ui="{ rounded: 'rounded-none' }" />
    </div>
    <div v-show="imageLoaded" class="bg-gray-200">
      <img
        v-if="imageUrl"
        ref="imageTag"
        :src="imageUrl"
        class="size-full transition-all"
        @load="onImageLoad"
      />
    </div>
  </div>
</template>
