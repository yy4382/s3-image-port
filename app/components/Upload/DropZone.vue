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
            <span>
              {{ $t("upload.fileUploader.dropZone.part1") }}
            </span>
            <span
              class="text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-500 hover:underline hover:underline-offset-2 transition-colors"
              >{{ $t("upload.fileUploader.dropZone.part2") }}</span
            >
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const fileList = defineModel<File[]>({ required: true });
const fileMap = new WeakMap<File, boolean>();

const onDrop = (files: File[] | null) => {
  pushFiles(files ?? []);
};
const dropZoneRef = useTemplateRef("dropZoneRef");
const { isOverDropZone } = useDropZone(dropZoneRef, onDrop);

const { open, onChange } = useFileDialog({
  accept: "image/*",
  // TODO: make select both files and directories work
  // directory: true, // select directory INSTEAD OF files
  multiple: true,
});
onChange((fileList) => {
  pushFiles(Array.from(fileList ?? []));
});

function pushFiles(files: File[]) {
  files.map((file) => {
    if (!fileMap.has(file)) {
      fileList.value.push(file);
      fileMap.set(file, true);
    }
  });
}
</script>
