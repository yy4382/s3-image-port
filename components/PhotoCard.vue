<template>
  <UCard>
    <img :src="photo.url" preview class="w-fit m-auto overflow-visible" />
    <template #footer>
      <div class="flex justify-between items-center gap-2">
        <div class="flex flex-col space-y-1">
          <div class="text-xs items-center inline-flex">
            <Icon name="i-mingcute-time-line" class="mr-2" />
            {{ DateTime.fromISO(photo.LastModified).toFormat("yyyy-LL-dd") }}
          </div>
          <div class="text-xs items-center inline-flex">
            <Icon name="i-mingcute-key-2-line" class="mr-2" />
            {{ photo.Key }}
          </div>
        </div>
        <div class="flex gap-2">
          <UButton
            aria-label="Copy Link"
            icon="i-mingcute-copy-2-line"
            @click="copy(photo, $event)"
          />
          <UButton
            aria-label="Delete"
            icon="i-mingcute-delete-3-line"
            @click="$emit('deletePhoto', photo.Key)"
          />
        </div>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import { DateTime } from "luxon";
import { type Photo } from "../types";
defineProps<{
  photo: Photo;
}>();
function copy(photo: Photo, event: MouseEvent) {
  navigator.clipboard.writeText(photo.url);
}
</script>
