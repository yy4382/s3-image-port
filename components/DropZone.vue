<template>
  <div>
    <div
      ref="dropZoneRef"
      class="border border-dashed rounded-md border-gray-500 hover:border-violet-400 cursor-pointer h-40 flex items-center justify-center"
      :class="
        isOverDropZone ? 'border-2 border-violet-400 bg-violet-500/5 ' : ''
      "
    >
      <p v-if="!isOverDropZone">Drop files here</p>
      <p v-if="isOverDropZone">Drop it!</p>
    </div>
    <div v-if="filesData.length > 0">
      <h3>Dropped Files:</h3>
      <ul>
        <li v-for="(file, index) in filesData" :key="index">
          {{ file.name }} ({{ (file.size / 1024).toFixed(2) }} KB)
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useDropZone } from "@vueuse/core";

const filesData = ref<File[]>([]);

function onDrop(files: File[] | null) {
  if (files) {
    filesData.value.push(...files);
  }
}

const dropZoneRef = ref<HTMLElement | null>(null);
const { isOverDropZone } = useDropZone(dropZoneRef, onDrop);
</script>
