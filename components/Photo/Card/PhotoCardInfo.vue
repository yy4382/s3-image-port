<template>
  <UPopover :overlay="isMobile">
    <slot>
      <UButton
        aria-label="Info"
        icon="i-mingcute-information-line"
        variant="ghost"
        color="white"
        size="lg"
      />
    </slot>
    <template #panel>
      <div
        class="flex flex-col space-y-1 flex-shrink basis-0 flex-grow min-w-0 p-2"
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
    </template>
  </UPopover>
</template>

<script lang="ts" setup>
import { DateTime } from "luxon";
import type { Photo } from "~/types";
import { breakpointsTailwind } from "@vueuse/core";
const isMobile = useBreakpoints(breakpointsTailwind).smaller("md");
defineProps<{
  photo: Photo;
}>();
</script>
