<script lang="ts" setup>
const settings = useSettingsStore();
const galleryState = useGalleryStateStore();

const selectedPhotos = computed(() => galleryState.imageSelected);
const hasSelectedPhotos = computed(() => selectedPhotos.value.length > 0);
</script>

<template>
  <div class="flex gap-2 items-center">
    <PhotoToolbarRefresh />

    <UButton
      icon="i-mingcute-checkbox-line"
      :label="hasSelectedPhotos ? selectedPhotos.length + '' : undefined"
      variant="solid"
      color="gray"
      @click="
        () => {
          if (hasSelectedPhotos) {
            galleryState.clearSelectedPhotos();
          } else {
            galleryState.selectDisplayedPhotos();
          }
        }
      "
    />
    <BaseSecondConfirm
      v-if="hasSelectedPhotos"
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
