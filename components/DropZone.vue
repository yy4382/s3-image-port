<template>
  <div>
    <div
      ref="dropZoneRef"
      class="drop-zone w-full"
      :class="isOverDropZone ? 'bg-red-500' : ''"
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

<style scoped>
.drop-zone {
  width: 100%;
  height: 200px;
  border: 2px dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px auto;
  text-align: center;
}
</style>
