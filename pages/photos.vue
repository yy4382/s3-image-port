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
const toast = useToast();
const config: Ref<Settings> = ref(DEFAULT_SETTINGS);
const photos = ref([] as Photo[]);
const categories = ref([] as string[]);
const categorizedPhotos: Ref<Record<string, Photo[]>> = ref({});

const curFirst: Ref<Record<string, number>> = ref({});

async function listPhotos() {
  const response = (await $fetch("/api/list", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      authorization: "Bearer " + config.value.token,
    },
  })) as {
    status: number;
    body: string;
  };
  photos.value = JSON.parse(response.body);
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
  const response = (await $fetch(`/api/delete?key=${key}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      authorization: "Bearer " + config.value.token,
    },
  })) as {
    statusCode: number;
    body: string;
  };
  if (response.statusCode === 200) {
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Photo deleted successfully",
      life: 3000,
    });
    await listPhotos();
  } else {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to delete photo",
      life: 3000,
    });
    console.error(response.body);
  }
}

onBeforeMount(async () => {
  config.value = localStorage.getItem("settings")
    ? JSON.parse(localStorage.getItem("settings") || "{}")
    : DEFAULT_SETTINGS;
  await listPhotos();

  if (process.env.NODE_ENV === "development") {
    console.log(photos.value);
  }
});
</script>
