<template>
  <div
    ref="rootDiv"
    class="relative group"
    :style="{
      width: `${masonryState.imageSizes.get(key)![0]}px`,
      height: `${masonryState.imageSizes.get(key)![1]}px`,
    }"
  >
    <USkeleton
      v-show="!showImg"
      class="h-full w-full"
      :ui="{ rounded: 'rounded-none' }"
    />
    <Transition>
      <div v-show="showImg" class="bg-gray-200">
        <img
          v-if="imageUrl"
          ref="loadedImage"
          :src="imageUrl"
          class="h-full w-full transition-all"
          :class="selected && 'scale-90 rounded-lg'"
          @load="onImageLoad"
        />
      </div>
    </Transition>
    <div
      class="absolute top-0 bottom-0 left-0 right-0 hover-to-show"
      style="
        background-image: linear-gradient(
          to top,
          rgba(0, 0, 0, 0.5),
          transparent 50px,
          transparent
        );
      "
      @click="
        () => {
          if (selectMode) selected = !selected;
          else modalOpen = true;
        }
      "
    ></div>
    <UCheckbox
      v-model="selected"
      class="absolute top-4 left-4 hover-to-show"
      :class="selected && '!opacity-100 !pointer-events-auto'"
      :ui="{
        container: 'h-6',
        base: 'w-6 h-6',
      }"
    />
    <div class="hover-to-show absolute left-4 bottom-4">
      <PhotoCardInfo
        v-if="width"
        :photo="photo"
        mode="hover"
        :ui="{ wrapper: 'h-5' }"
      >
        <UIcon name="i-mingcute-information-line" class="text-white w-5 h-5" />
      </PhotoCardInfo>
    </div>
    <UButton
      :aria-label="selectMode ? 'Open fullscreen' : 'Copy Link'"
      :icon="selectMode ? 'i-mingcute-zoom-in-line' : 'i-mingcute-copy-2-line'"
      color="gray"
      class="absolute bottom-4 right-4 hover-to-show"
      @click="
        () => {
          if (selectMode) modalOpen = true;
          else copy(photo);
        }
      "
    />
    <UModal v-model="modalOpen" fullscreen>
      <PhotoCardModal
        v-model="selected"
        :photo="photo"
        :close-modal="() => (modalOpen = false)"
        @delete-photo="
          (key: string) => {
            $emit('deletePhoto', key), (modalOpen = false);
          }
        "
      />
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { type Photo } from "~/types";
const loadedImage = ref<null | HTMLImageElement>(null);
const rootDiv = ref<HTMLDivElement | null>(null);
const props = defineProps<{
  photo: Photo;
  disabled?: boolean;
  selectMode: boolean;
}>();

defineEmits<{ deletePhoto: [key: string] }>();

const key = computed(() => props.photo.Key);
const selected = ref(false);
const naturalSize = ref<[number, number] | undefined>(undefined);
const width = ref<number | undefined>(undefined);
const showImg = ref(false);
defineExpose({
  key,
  selected,
  naturalSize,
});

const modalOpen = ref(false);

const { imageBlob } = useImageDisplay(key);
const imageUrl = useObjectUrl(imageBlob);

const masonryState = useMasonryStateStore();
watchEffect(() => {
  masonryState.setNaturalSize(key.value, naturalSize.value);
});

const toast = useToast();
const { t } = useI18n();
function copy(photo: Photo) {
  navigator.clipboard.writeText(photo.url);
  toast.add({ title: t("photos.message.copyLink.title") });
}
useResizeObserver(rootDiv, (entries) => {
  const entry = entries[0];
  if (!entry) return;
  const { width: entryWidth, height: entryHeight } = entry.contentRect;
  width.value = entryWidth;
  if (
    naturalSize.value &&
    Math.abs(
      entryWidth / entryHeight - naturalSize.value[0] / naturalSize.value[1],
    ) < 0.001
  ) {
    setTimeout(() => {
      showImg.value = true;
    }, 150);
  }
});

function onImageLoad() {
  if (!loadedImage.value) return;
  const { naturalWidth, naturalHeight } = loadedImage.value;
  naturalSize.value = [naturalWidth, naturalHeight];
}
onMounted(() => {
  if (loadedImage.value?.complete) {
    // If the image is already loaded, call onImageLoad directly
    onImageLoad();
  }
});
</script>

<style scoped lang="postcss">
@tailwind utilities;
@layer utilities {
  .hover-to-show {
    @apply pointer-events-none group-hover:pointer-events-auto focus-visible:pointer-events-auto
     opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus-visible:opacity-100 transition-opacity duration-200;
  }
}
.v-enter-active {
  transition: opacity 0.2s ease;
}

.v-enter-from {
  opacity: 0;
}
</style>
