<template>
  <div class="flex flex-col gap-4 mx-6">
    <div class="card flex justify-content-center">
      <Dropdown
        v-model="category"
        :options="categories"
        placeholder="Select a category"
        editable
      />
    </div>
    <div class="card">
      <Toast />
      <FileUpload
        name="demo[]"
        :multiple="true"
        accept="image/*"
        :maxFileSize="1000000"
        customUpload
        @uploader="uploadHandler"
      >
        <template #empty>
          <p>Drag and drop files to here to upload.</p>
        </template>
      </FileUpload>
      <TabView v-if="uploadedLinksFormatted.links.length !== 0">
        <TabPanel header="Links">
          <ul>
            <li v-for="link in uploadedLinksFormatted.links" :key="link">
              <a :href="link" target="_blank">{{ link }}</a>
            </li>
          </ul>
        </TabPanel>
        <TabPanel header="Markdown">
          <ul>
            <li v-for="link in uploadedLinksFormatted.markdown" :key="link">
              <p>{{ link }}</p>
            </li>
          </ul>
        </TabPanel>
      </TabView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from "primevue/usetoast";
import { DateTime, Interval } from "luxon";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { type Settings } from "~/types";
interface ImageLink {
  link: string;
  name: string;
}
const toast = useToast();
const category = ref("");
const categories: Ref<string[]> = ref([]);
const uploadedLinks: Ref<ImageLink[]> = ref([]);
const uploadedLinksFormatted = computed(() => ({
  links: uploadedLinks.value.map((link) => link.link),
  markdown: uploadedLinks.value.map((link) => `![${link.name}](${link.link})`),
}));

onBeforeMount(() => {
  categories.value = JSON.parse(
    localStorage.getItem("image_categories") || "[]"
  );
});

function genKey(file: File, type: string) {
  const now = DateTime.now();
  const today_start = now.startOf("day");
  const interval = Interval.fromDateTimes(today_start, now);
  const fileExt = file.name.split(".").pop();
  const filename = `${interval
    .length("milliseconds")
    .toString(36)}-${Math.random().toString(36).substring(2, 4)}.${
    type === "none" ? fileExt : type
  }`;
  return (
    category.value +
    "/" +
    DateTime.now().toFormat("yyyy/LL/dd") +
    "/" +
    filename
  );
}

async function convert(file: File, type: string): Promise<Blob | File> {
  if (type === "none") return file;

  const mime = "image/webp";
  if (type === "webp") {
    const mime = "image/webp";
  } else if (type === "jpg") {
    const mime = "image/jpeg";
  }
  const img = new Image();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const reader = new FileReader();
  const p = new Promise<Blob>((resolve, reject) => {
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        resolve(blob as Blob);
      }, mime);
    };
  });
  reader.readAsDataURL(file);
  return p;
}

const uploadHandler = async (e: any) => {
  if (!category.value) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Please select a category",
      life: 3000,
    });
    return;
  }
  const files = e.files as File[];
  const s3Settings: Settings = JSON.parse(
    localStorage.getItem("settings") || "{}"
  );
  const client = new S3Client({
    region: s3Settings.region,
    credentials: {
      accessKeyId: s3Settings.accKeyId,
      secretAccessKey: s3Settings.secretAccKey,
    },
    endpoint: s3Settings.endpoint,
  });
  const bucket = s3Settings.bucket;
  for (const file of files) {
    const converted = await convert(file, s3Settings.convert);
    const upload = new PutObjectCommand({
      Bucket: bucket,
      Key: genKey(file, s3Settings.convert),
      Body: converted,
    });
    client
      .send(upload)
      .then((data) => {
        toast.add({
          severity: "info",
          summary: "Success",
          detail: "File Uploaded",
          life: 3000,
        });
        uploadedLinks.value.push({
          link: `${s3Settings.endpoint}/${bucket}/${upload.input.Key}`,
          name: file.name,
        });
      })
      .catch((error) => {
        console.error(error);
        toast.add({
          severity: "error",
          summary: "Error",
          detail: "File Upload Failed",
          life: 3000,
        });
      });
  }
};
</script>
