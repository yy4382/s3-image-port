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
      <!-- Info Button -->
      <UPopover mode="hover">
        <UButton
          aria-label="Delete"
          icon="i-mingcute-information-line"
          variant="ghost"
          color="white"
          size="lg"
        />
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
      <!-- Delete Button -->
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
import { DateTime } from "luxon";
import type { Photo } from "~/types";
defineProps<{
  photo: Photo;
  closeModal: () => void;
}>();
defineEmits<{ deletePhoto: [key: string] }>();
</script>
