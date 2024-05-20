<!--
  The current behavior is: 
  - to add the selected file if it's via either drag and drop or file dialog
-->
<template>
  <div>
    <div
      ref="dropZoneRef"
      class="border border-dashed rounded-md border-gray-500 hover:border-primary-500 dark:hover:border-primary-400 cursor-pointer w-full h-full place-content-center"
      :class="
        isOverDropZone &&
        'border-2 border-primary-500 dark:border-primary-400 bg-primary-500/5 -m-[1px]'
      "
      @click="open()"
    >
      <div
        class="flex flex-col p-10 space-y-2"
        :class="isOverDropZone && 'translate-x-[1px]'"
      >
        <div class="flex justify-center">
          <UIcon name="i-mingcute-upload-3-line" />
        </div>
        <div class="flex justify-center">
          <p class="text-ellipsis whitespace-nowrap">
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
    <!-- <div v-if="filesData.length > 0">
      <h3>Dropped Files:</h3>
      <ul>
        <li v-for="(file, index) in filesData" :key="index">
          {{ file.name }} ({{ (file.size / 1024).toFixed(2) }} KB)
        </li>
      </ul>
    </div> -->
    <!--for debug-->
  </div>
</template>

<script setup lang="ts">
// const filesData = ref<File[]>([]);
const filesData = defineModel<File[]>("filesData", {
  default: [],
});

const updateFilesByName = (toUpdateFiles: File[], newFiles: File[]): File[] => {
  const newFileNames = newFiles.map((file) => file.name);
  const updatedFiles: File[] = [];
  updatedFiles.push(...newFiles); // new files are always added
  updatedFiles.push(
    ...toUpdateFiles.filter((file) => !newFileNames.includes(file.name)) // old files are added if not in new files
  );
  return updatedFiles;
};

const onDrop = (files: File[] | null) => {
  if (files) {
    filesData.value = updateFilesByName(filesData.value, files);
  }
};
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
    const files = Array.from(fileList);
    filesData.value = updateFilesByName(filesData.value, files);
  }
});
</script>
