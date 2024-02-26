<template>
  <div>
    <TabView class="mx-4 rounded-lg">
      <TabPanel
        v-for="category in Object.keys(categorizedPhotos)"
        :key="category"
        :header="category"
      >
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 -mx-5 mb-4">
          <div
            v-for="photo in categorizedPhotos[category].slice(
              curFirst[category],
              curFirst[category] + 9,
            )"
          >
            <PhotoCard :photo="photo" />
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
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { ref, onMounted, type Ref, computed } from "vue";
import { type Photo, type Settings, DEFAULT_SETTINGS } from "../types";
interface s3Photo {
  Key: string;
  LastModified: Date;
  ETag: string;
  Size: number;
  StorageClass: string;
}
const categories = ref([] as string[]);
const photos = ref([] as Photo[]);
const categorizedPhotos: Ref<Record<string, Photo[]>> = ref({});

const s3Settings: Ref<Settings> = ref(DEFAULT_SETTINGS);

const curFirst: Ref<Record<string, number>> = ref({});
watch(categories, (newVal) => {
  localStorage.setItem("image_categories", JSON.stringify(categories.value));
});
function newClient() {
  return new S3Client({
    region: s3Settings.value.region,
    credentials: {
      accessKeyId: s3Settings.value.accKeyId,
      secretAccessKey: s3Settings.value.secretAccKey,
    },
    endpoint: s3Settings.value.endpoint,
  });
}

async function listPhotos() {
  const client = newClient();
  const command = new ListObjectsV2Command({
    Bucket: s3Settings.value.bucket,
  });
  const response = await client.send(command);
  console.log(response.Contents);
  return (response.Contents as s3Photo[])
    .map((photo: s3Photo) => {
      return {
        Key: photo.Key,
        LastModified: photo.LastModified,
        category: photo.Key.split("/")[0],
        url: `${s3Settings.value.endpoint}/${s3Settings.value.bucket}/${photo.Key}`,
      };
    })
    .filter((photo) => !photo.Key.endsWith("/")) as Photo[];
}
onBeforeMount(async () => {
  s3Settings.value = localStorage.getItem("settings")
    ? JSON.parse(localStorage.getItem("settings") || "{}")
    : DEFAULT_SETTINGS;
  photos.value = await listPhotos();
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

  if (process.env.NODE_ENV === "development") {
    console.log(photos.value);
  }
});
</script>
