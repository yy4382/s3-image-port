<template>
  <DropZone v-model:files-data="filesData" />
  <UTable
    v-if="tableData.length !== 0"
    v-model="tableDataSelected"
    :rows="tableData"
  />
  <div v-if="tableData.length !== 0" class="flex flex-row justify-end gap-2">
    <UButton
      label="Upload Selected"
      variant="outline"
      @click="uploadSelectedByName"
    />
    <UButton
      label="Remove Selected"
      color="red"
      @click="removeSelectedByName"
    />
  </div>
</template>

<script setup lang="ts">
import type { PhotoToUpload } from "~/types";

const filesData = defineModel<File[]>("filesData", {
  default: [],
});
const getTableDataFromFilesData = (): PhotoToUpload[] => {
  return filesData.value.map((file) => ({
    name: file.name,
    size: file.size,
  }));
};
const tableData = ref<PhotoToUpload[]>(getTableDataFromFilesData());
const tableDataSelected = ref<PhotoToUpload[]>([]);

watch(filesData, () => {
  const oldTableData = tableData.value;
  const newTableData = getTableDataFromFilesData();
  // add new files to selected
  tableDataSelected.value.push(
    ...newTableData.filter(
      (file) => !oldTableData.map((file) => file.name).includes(file.name)
    )
  );
  tableData.value = newTableData;
});

const removeSelectedByName = () => {
  filesData.value = filesData.value.filter(
    (file) =>
      !tableDataSelected.value.map((file) => file.name).includes(file.name)
  );
  // tableData.value = getTableDataFromFilesData(); // auto updated by `watch`
  tableDataSelected.value = [];
};

const uploadSelectedByName = () => {
  for (const file of filesData.value) {
    console.log("Uploaded " + file.name);
  }
  filesData.value = [];
  tableDataSelected.value = [];
};
</script>
