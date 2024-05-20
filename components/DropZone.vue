<!--
  The current behavior is: 
  - to update to the selected file if it's via the file selector, or
  - to add the selected file if it's via drag and drop.
-->
<template>
  <div>
    <div
      ref="dropZoneRef"
      class="border border-dashed rounded-md border-gray-500 hover:border-primary-500 dark:hover:border-primary-400 transition-all cursor-pointer w-full h-full flex items-center justify-center"
      :class="
        isOverDropZone &&
        'border-2 border-primary-500 dark:border-primary-400 bg-primary-500/5 '
      "
      @click="open()"
    >
      <div class="flex flex-col m-10">
        <div class="flex justify-center">
          <UIcon name="i-mingcute-upload-3-line" />
        </div>
        <div class="flex justify-center">
          <p>
            Drop files here or
            <span
              class="text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-500 hover:underline hover:underline-offset-2 transition-colors"
              >click to upload</span
            >
          </p>
        </div>
      </div>
    </div>
    <!--for debug-->
    <div v-if="filesData.length > 0">
      <h3>Dropped Files:</h3>
      <ul>
        <li v-for="(file, index) in filesData" :key="index">
          {{ file.name }} ({{ (file.size / 1024).toFixed(2) }} KB)
        </li>
      </ul>
    </div>
    <!--for debug-->
  </div>
</template>

<script setup lang="ts">
import { useDropZone, useFileDialog } from "@vueuse/core";

const filesData = ref<File[]>([]);
function onDrop(files: File[] | null) {
  if (files) {
    filesData.value.push(...files);
  }
}
const dropZoneRef = ref<HTMLElement | null>(null);
const { isOverDropZone } = useDropZone(dropZoneRef, onDrop);

const { open, onChange } = useFileDialog({
  accept: "image/*",
  // TODO: make select both files and directories work
  // directory: true, // select directory INSTEAD OF files
  multiple: true,
});
onChange((fileList) => {
  if (fileList) {
    filesData.value = Array.from(fileList);
  }
});
</script>
