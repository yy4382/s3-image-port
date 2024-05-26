<template>
  <div ref="rootDiv" class="relative group bg-gray-200">
    <img
      ref="loadedImage"
      :src="photo.url"
      class="h-full w-full transition-transform"
      :class="selected && 'scale-90 rounded-lg'"
      @load="onImageLoad"
    />
    <div
      class="absolute top-0 bottom-0 left-0 right-0 hover-to-show"
      style="
        background-image: linear-gradient(
          to top,
          rgba(0, 0, 0, 0.6),
          transparent 100px,
          transparent
        );
      "
      @click="modalOpen = true"
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
      <UPopover v-if="width && width < 270" mode="hover">
        <UIcon name="i-mingcute-information-line" class="text-white w-5 h-5" />
        <template #panel>
          <div
            class="flex flex-col space-y-1 flex-shrink basis-0 flex-grow min-w-0 p-2"
          >
            <div class="text-sm items-center inline-flex">
              <Icon name="i-mingcute-time-line" class="shrink-0 mr-2" />
              <span class="truncate block">
                {{
                  DateTime.fromISO(photo.LastModified).toFormat("yyyy-LL-dd")
                }}
              </span>
            </div>
            <div class="text-sm items-center inline-flex">
              <Icon name="i-mingcute-key-2-line" class="shrink-0 mr-2" />
              <span :title="photo.Key" class="truncate block">
                {{ photo.Key }}
              </span>
            </div>
          </div>
        </template>
      </UPopover>
      <div
        v-else-if="width"
        class="flex flex-col space-y-1 flex-shrink basis-0 flex-grow min-w-0 text-white"
      >
        <div class="text-sm items-center inline-flex">
          <Icon name="i-mingcute-time-line" class="shrink-0 mr-2" />
          <span class="truncate block">
            {{ DateTime.fromISO(photo.LastModified).toFormat("yyyy-LL-dd") }}
          </span>
        </div>
        <div class="text-sm items-center inline-flex">
          <Icon name="i-mingcute-key-2-line" class="shrink-0 mr-2" />
          <span :title="photo.Key" class="truncate block">
            {{ photo.Key }}
          </span>
        </div>
      </div>
    </div>
    <UButton
      aria-label="Copy Link"
      icon="i-mingcute-copy-2-line"
      color="gray"
      class="absolute bottom-4 right-4 hover-to-show"
      @click="copy(photo)"
    />
    <UModal v-model="modalOpen" fullscreen>
      <PhotoCardModal
        :photo="photo"
        :close-modal="() => (modalOpen = false)"
        @delete-photo="
          (key) => {
            $emit('deletePhoto', key), (modalOpen = false);
          }
        "
      />
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { DateTime } from "luxon";
import { type Photo } from "../types";
const loadedImage = ref<null | HTMLImageElement>(null);
const rootDiv = ref<HTMLDivElement | null>(null);
const props = defineProps<{
  photo: Photo;
  disabled: boolean;
}>();

defineEmits<{ deletePhoto: [key: string] }>();

const key = computed(() => props.photo.Key);
const selected = ref(false);
const naturalSize = ref<[number, number] | undefined>(undefined);
const width = ref<number | undefined>(undefined);
defineExpose({
  key,
  selected,
  naturalSize,
});

const modalOpen = ref(false);

const toast = useToast();
const { t } = useI18n();
function copy(photo: Photo) {
  navigator.clipboard.writeText(photo.url);
  toast.add({ title: t("photos.message.copyLink.title") });
}
useResizeObserver(rootDiv, (entries) => {
  const entry = entries[0];
  const { width: entryWidth } = entry.contentRect;
  width.value = entryWidth;
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
</style>
