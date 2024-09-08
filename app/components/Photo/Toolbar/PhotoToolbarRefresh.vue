<script lang="ts" setup>
const settings = useSettingsStore();
const galleryState = useGalleryStateStore();
const isLoading = ref(false);
onMounted(async () => {
  if (!settings.validity.s3) {
    useWrongSettingToast("s3");
    console.error("Invalid S3 settings");
  }
  if (!settings.validity.app) {
    useWrongSettingToast("app");
    console.error("Invalid app settings");
  }
  if (settings.app.enableAutoRefresh) {
    listImages();
  }
});
const listImages = async () => {
  isLoading.value = true;
  await galleryState.listImages();
  isLoading.value = false;
};
</script>

<template>
  <UButton
    icon="i-mingcute-refresh-2-line"
    :disabled="!settings.validity.s3"
    variant="outline"
    :loading="isLoading"
    @click="listImages"
  />
</template>
