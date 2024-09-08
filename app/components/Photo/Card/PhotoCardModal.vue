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
    <UCheckbox
      v-model="selected"
      class="absolute top-4 left-14"
      :ui="{
        container: 'h-6',
        base: 'w-6 h-6',
      }"
    />
    <div class="absolute flex justify-center items-center right-2 top-2">
      <!-- Info Button -->
      <PhotoCardInfo :photo="photo" :popper="{ placement: 'bottom-end' }" />
      <!-- Delete Button -->
      <BaseSecondConfirm
        :action="() => galleryState.deletePhoto([photo.Key])"
        danger
      >
        <UButton
          aria-label="Delete"
          icon="i-mingcute-delete-3-line"
          variant="ghost"
          color="white"
          size="lg"
        />
      </BaseSecondConfirm>
    </div>
    <img :src="photo.url" class="w-full h-full object-contain" />
  </div>
</template>

<script lang="ts" setup>
import type { Photo } from "~/types";
const selected = defineModel<boolean>({ required: true });
defineProps<{
  photo: Photo;
  closeModal: () => void;
}>();
const galleryState = useGalleryStateStore();
</script>
