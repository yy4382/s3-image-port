<template>
    <div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mx-2 mb-4">
            <div v-for="photo in photos.slice(curFirst, curFirst + 10)">
                <PhotoCard :photo="photo" />
            </div>
        </div>
        <Paginator :rows="10" :totalRecords="photos.length" v-model:first="curFirst"
            template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink">
        </Paginator>
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
const photos = ref([] as Photo[]);
const s3Settings: Ref<Settings> = ref(DEFAULT_SETTINGS);

const curFirst = ref(0);
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
    return (response.Contents as s3Photo[]).map((photo: s3Photo) => {
        return {
            Key: photo.Key,
            LastModified: photo.LastModified,
            category: photo.Key.split("/")[0],
            url: `${s3Settings.value.endpoint}/${s3Settings.value.bucket}/${photo.Key}`,
        };
    }).filter((photo) => !photo.Key.endsWith("/")) as Photo[];
}
onMounted(async () => {
    s3Settings.value = localStorage.getItem("settings") ? JSON.parse(localStorage.getItem("settings") || "{}") : DEFAULT_SETTINGS;
    photos.value = await listPhotos();

    if (process.env.NODE_ENV === "development") {
        console.log(photos.value);
    }
});

</script>