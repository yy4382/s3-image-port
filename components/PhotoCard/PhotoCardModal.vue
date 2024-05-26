<template>
  <div class="relative bg-gray-200 dark:bg-black w-full h-full">
    <div
      class="absolute h-full w-full"
      style="
        background-image: linear-gradient(
          to bottom,
          rgba(0, 0, 0, 0.5),
          transparent 78px,
          transparent
        );
      "
    ></div>
    <UButton
      variant="ghost"
      color="white"
      icon="i-mingcute-arrow-left-line"
      class="absolute top-2 left-2"
      size="lg"
      @click="closeModal"
    />
    <div class="absolute flex justify-center items-center right-2 top-2">
      <UPopover overlay>
        <UButton
          aria-label="Delete"
          icon="i-mingcute-delete-3-line"
          variant="ghost"
          color="white"
          size="lg"
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
    <img :src="photo.url" class="w-full h-full object-contain" />
  </div>
</template>

<script lang="ts" setup>
import type { Photo } from "~/types";
defineProps<{
  photo: Photo;
  closeModal: () => void;
}>();
defineEmits<{ deletePhoto: [key: string] }>();
</script>
