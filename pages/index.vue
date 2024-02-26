<template>
    <div class="flex flex-col gap-4 mx-6">
        <div class="card flex justify-content-center">
            <AutoComplete v-model="category" :suggestions="items" @complete="search" dropdown />
        </div>
        <div class="card">
            <Toast />
            <FileUpload name="demo[]" :multiple="true" accept="image/*" :maxFileSize="1000000" customUpload
                @uploader="uploadHandler">
                <template #empty>
                    <p>Drag and drop files to here to upload.</p>
                </template>
            </FileUpload>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useToast } from "primevue/usetoast";
import { DateTime } from "luxon";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { type Settings } from "~/types";
const toast = useToast();
const category = ref("");
const categories = ["i", "title", "category", "date"];
const items = ref([]);


const onAdvancedUpload = () => {
    toast.add({ severity: 'info', summary: 'Success', detail: 'File Uploaded', life: 3000 });
};
const search = () => { }
function genKey(name: string) {
    return category.value + "/" + DateTime.now().toFormat("yyyy/LL/dd") + "/" + name;
}
const uploadHandler = (e: any) => {
    const files = e.files;
    const s3Settings: Settings = JSON.parse(localStorage.getItem("settings") || "{}");
    const client = new S3Client({
        region: s3Settings.region,
        credentials: {
            accessKeyId: s3Settings.accKeyId,
            secretAccessKey: s3Settings.secretAccKey,
        },
        endpoint: s3Settings.endpoint,
    });
    const bucket = s3Settings.bucket;
    const upload = new PutObjectCommand({
        Bucket: bucket,
        Key: genKey(files[0].name),
        Body: files[0],
    });
    client.send(upload).then((data) => {
        console.log(data);
        toast.add({ severity: 'info', summary: 'Success', detail: 'File Uploaded', life: 3000 });
    }).catch((error) => {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'File Upload Failed', life: 3000 });
    });
}
</script>