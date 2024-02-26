<template>
  <div class="mx-4">
    <Button
      label="Refresh"
      icon="pi pi-refresh"
      @click="listPhotos"
      class="mb-4"
    />
    <TabView>
      <TabPanel
        v-for="category in Object.keys(categorizedPhotos)"
        :key="category"
        :header="category"
      >
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div
            v-for="photo in categorizedPhotos[category].slice(
              curFirst[category],
              curFirst[category] + 9,
            )"
          >
            <PhotoCard :photo="photo" @delete-photo="deletePhoto" />
          </div>
        </div>
        <Paginator
          :rows="9"
          :totalRecords="categorizedPhotos[category].length"
          v-model:first="curFirst[category]"
          template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
        >
        </Paginator>
      </TabPanel>
    </TabView>
  </div>
</template>
<script setup lang="ts">
import { type Photo, type Settings, DEFAULT_SETTINGS } from "../types";

const s3Settings: Ref<Settings> = ref(DEFAULT_SETTINGS);
const photos = ref([] as Photo[]);
const categories = ref([] as string[]);
const categorizedPhotos: Ref<Record<string, Photo[]>> = ref({});

const curFirst: Ref<Record<string, number>> = ref({});

async function listPhotos() {
  photos.value = await listObj(s3Settings.value);
  categories.value = Array.from(
    new Set(photos.value.map((photo) => photo.category)),
  );
  categorizedPhotos.value = Object.fromEntries(
    categories.value.map((category) => [
      category,
      photos.value.filter((photo) => photo.category === category),
    ]),
  );
  curFirst.value = Object.fromEntries(
    categories.value.map((category) => [category, 0]),
  );
}
async function deletePhoto(key: string) {
  await deleteObj(key, s3Settings.value)
    .then(() => listPhotos())
    .catch(console.error);
}

onBeforeMount(async () => {
  s3Settings.value = localStorage.getItem("settings")
    ? JSON.parse(localStorage.getItem("settings") || "{}")
    : DEFAULT_SETTINGS;
  await listPhotos();

  if (process.env.NODE_ENV === "development") {
    console.log(photos.value);
  }
});
</script>
