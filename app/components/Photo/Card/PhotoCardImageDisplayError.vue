<script lang="ts" setup>
const props = defineProps<{
  s3Key: string;
}>();
const key = toRefs(props).s3Key;

const { mimeType, refresh } = useImageMime(key);
</script>

<template>
  <div
    class="size-full flex items-center justify-center border-2 dark:border-gray-700"
  >
    <div class="flex flex-col items-center justify-center gap-2">
      <p>{{ $t("photos.photoCard.notPhotoIndicator.title") }}</p>
      <p class="text-xs">Key: {{ key }}</p>
      <p class="text-xs">Mime: {{ mimeType ?? "loading..." }}</p>
      <div class="flex gap-2">
        <UButton v-if="refresh" @click="refresh()">{{
          $t("photos.photoCard.notPhotoIndicator.refresh")
        }}</UButton>
      </div>
    </div>
  </div>
</template>
