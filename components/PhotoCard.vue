<template>
    <div class="flex flex-col justify-between !bg-surface-50 dark:!bg-surface-800 p-2 gap-2 rounded-md h-full">
        <div class="dark:text-white/80">
            <p><span class="text-white/50">Upload Folder Date </span> {{ photo.Key.split("/").slice(1, -1).join("-") }}</p>
            <p><span class="text-white/50">Last Modified </span>
                {{ DateTime.fromJSDate(photo.LastModified).toFormat("yyyy-LL-dd") }}
            </p>
        </div>
        <Image :src="photo.url" preview class="w-fit mx-auto overflow-visible">
            <template #image>
                <img :src="photo.url" alt="preview" class="max-h-64" />
            </template>
            <template #preview="slotProps">
                <img :src="photo.url" alt="preview" :style="slotProps.style" @click="slotProps.previewCallback"
                    class="max-w-[calc(100vw-10rem)] max-h-[calc(100vh-10rem)]" />
            </template>
        </Image>
        <div class="flex justify-between items-center gap-2">
            <Chip class="pl-0 pr-3 h-fit" v-tooltip="`category`">
                <span
                    class="bg-primary-500 dark:bg-primary-400 text-surface-0 dark:text-surface-900 rounded-full w-8 h-8 flex items-center justify-center">C</span>
                <span class="ml-2 font-medium">{{ photo.category }}</span>
            </Chip>
            <div class="flex gap-2">
                <Button aria-label="Copy Link" icon="pi pi-link" class="p-button-info" @click="copy(photo, $event)" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { DateTime } from "luxon";
import { type Photo } from "../types";
import Tooltip from "primevue/tooltip";
const props = defineProps<{
    photo: Photo;
}>();
onMounted(() => {
    const photo = props.photo;
});
const vTooltip = Tooltip;
function copy(photo: Photo, event: MouseEvent) {
    navigator.clipboard.writeText(photo.url);
}
</script>
