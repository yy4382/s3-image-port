<template>
  <div
    class="flex flex-col justify-between dark:bg-surface-700 bg-surface-50 p-2 gap-2 rounded-md h-full"
  >
    <Image :src="photo.url" preview class="w-fit m-auto overflow-visible">
      <template #image>
        <img :src="photo.url" alt="preview" class="max-h-96" />
      </template>
      <template #preview="slotProps">
        <img
          :src="photo.url"
          alt="preview"
          :style="slotProps.style"
          @click="slotProps.previewCallback"
          class="max-w-[calc(100vw-3rem)] max-h-[calc(100vh-10rem)]"
        />
      </template>
    </Image>
    <div class="flex justify-between items-center gap-2">
      <div class="flex flex-col justify-between gap-1">
        <Chip class="text-sm" >
          <i class="pi pi-cloud-upload mr-1" />
          {{ photo.Key.split("/").slice(1, -1).join("-") }}
        </Chip>
        <Chip class="text-sm" >
          <i class="pi pi-pencil mr-1" />
          {{ DateTime.fromJSDate(photo.LastModified).toFormat("yyyy-LL-dd") }}
        </Chip>
      </div>
      <div class="flex gap-2">
        <Button
          aria-label="Copy Link"
          icon="pi pi-link"
          class="p-button-info"
          @click="copy(photo, $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DateTime } from "luxon";
import { type Photo } from "../types";
import Tooltip from "primevue/tooltip";
defineProps<{
  photo: Photo;
}>();
const vTooltip = Tooltip;
function copy(photo: Photo, event: MouseEvent) {
  navigator.clipboard.writeText(photo.url);
}
</script>
