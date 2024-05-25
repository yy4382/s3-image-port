<template>
  <div class="relative group">
    <img
      ref="loadedImage"
      :src="photo.url"
      class="h-full w-full border"
      @load="onImageLoad"
    />
    <div
      class="absolute top-0 bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 bg-[rgba(0,_0,_0,_0.7)] transition-opacity duration-200 has-[:focus-visible]:opacity-100 flex items-end justify-start p-4"
      :class="selected && '!opacity-100'"
    >
      <div class="absolute top-4 left-4">
        <slot name="checkbox" />
      </div>
      <div
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
      <div class="absolute top-4 right-4 flex flex-nowrap gap-2">
        <UButton
          aria-label="Copy Link"
          icon="i-mingcute-copy-2-line"
          color="gray"
          @click="copy(photo)"
        />
        <UPopover overlay>
          <UButton
            aria-label="Delete"
            icon="i-mingcute-delete-3-line"
            color="gray"
            :disabled="disabled"
          />
          <template #panel="{ close }">
            <div class="flex p-4 gap-3 items-center">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ $t("photos.photoCard.deleteButton.confirm.title") }}
              </div>
              <div class="flex items-center gap-2 flex-shrink-0 mt-0">
                <UButton
                  size="xs"
                  :label="
                    $t('photos.photoCard.deleteButton.confirm.actions.cancel')
                  "
                  color="gray"
                  @click="close()"
                />
                <UButton
                  size="xs"
                  :label="
                    $t('photos.photoCard.deleteButton.confirm.actions.confirm')
                  "
                  color="red"
                  @click="
                    $emit('deletePhoto', photo.Key);
                    close();
                  "
                />
              </div>
            </div>
          </template>
        </UPopover>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DateTime } from "luxon";
import { type Photo } from "../types";
const loadedImage = ref<null | HTMLImageElement>(null);
defineProps<{
  photo: Photo;
  disabled: boolean;
  selected: boolean;
}>();
const emit = defineEmits<{
  (e: "deletePhoto", key: string): void;
  (e: "imageLoaded", size: [number, number]): void;
}>();
const toast = useToast();
const { t } = useI18n();
function copy(photo: Photo) {
  navigator.clipboard.writeText(photo.url);
  toast.add({ title: t("photos.message.copyLink.title") });
}
function onImageLoad() {
  if (!loadedImage.value) return;
  const { naturalWidth, naturalHeight } = loadedImage.value;
  emit("imageLoaded", [naturalWidth, naturalHeight]);
}
</script>
