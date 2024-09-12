<script lang="ts" setup>
const settings = useSettingsStore();
const galleryState = useGalleryStateStore();

const selectedPhotos = computed(() => galleryState.imageSelected);
</script>

<template>
  <div class="flex gap-2 items-center">
    <PhotoToolbarRefresh />

    <UButton
      v-if="selectedPhotos.length > 0"
      icon="i-mingcute-checkbox-line"
      :label="selectedPhotos.length + ''"
      variant="solid"
      color="gray"
      @click="galleryState.clearSelectedPhotos"
    />
    <BaseSecondConfirm
      v-if="selectedPhotos.length > 0"
      :action="
        () => {
          galleryState.deletePhoto();
          selectedPhotos.length = 0;
        }
      "
      danger
    >
      <UButton
        aria-label="Delete"
        :label="selectedPhotos.length + ''"
        icon="i-mingcute-delete-3-line"
        color="red"
        variant="solid"
        :disabled="!settings.validity.s3"
      />
    </BaseSecondConfirm>
  </div>
</template>
