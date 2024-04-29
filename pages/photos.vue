<template>
  <UContainer class="space-y-4">
    <UButton
      :label="photos.length === 0 ? 'Load' : 'Refresh'"
      @click="listPhotos"
      variant="outline"
    />
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div v-for="photo in photos.slice((page - 1) * 9, page * 9)">
        <PhotoCard :photo="photo" @delete-photo="deletePhoto" />
      </div>
    </div>
    <UPagination
      class="mx-auto max-w-fit"
      v-model="page"
      :total="photos.length"
      :perPage="9"
      v-if="photos.length > 0"
    />
  </UContainer>
</template>
<script setup lang="ts">
import { type Photo, type S3Config } from "../types";
import { useStorage } from "@vueuse/core";
const router =  useRouter();
const toast = useToast();
const photos: Ref<Photo[]> = useStorage("s3-photos", []);
const s3Config = useStorage<S3Config>("s3-settings", {} as S3Config);
const page = ref(1);

async function listPhotos() {
  try {
    photos.value = (await listObj(s3Config.value)).reverse();
  } catch (error) {
    toast.add({
      title: "Failed to list photos",
      description: "Open dev console for more info",
      actions:[{label: "Retry", click: listPhotos}, {label: "Go to settings", click: () => router.push("/settings")}]
    });
    console.error((error as Error).message);
  }
}
async function deletePhoto(key: string) {
  try {
    toast.add({
      title: "Delete requested...",
      timeout: 1000,
    });
    await deleteObj(key, s3Config.value);
    toast.add({
      title: "Photo deleted successfully",
    });
    await listPhotos();
  } catch (error) {
    toast.add({
      title: "Failed to delete photo",
    });
    console.error((error as Error).message);
  }
}
</script>
