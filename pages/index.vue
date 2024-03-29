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
      <TabView v-if="uploadedLinksFormatted.length !== 0">
        <TabPanel header="Links">
          <ul>
            <li v-for="link in uploadedLinksFormatted" :key="link.link">
              <a :href="link.link" target="_blank">{{ link.link }}</a>
            </li>
          </ul>
        </TabPanel>
        <TabPanel header="Markdown">
          <ul>
            <li v-for="link in uploadedLinksFormatted" :key="link.link">
              <a :href="link.link" target="_blank">{{ link.markdown }}</a>
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
const uploadedLinksFormatted = computed(() =>
  uploadedLinks.value.map((link) => ({
    link: link.link,
    markdown: `![${link.name}](${link.link})`,
  })),
);

onBeforeMount(() => {
  categories.value = JSON.parse(
    localStorage.getItem("image_categories") || "[]",
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

async function convert(file: File, type: string): Promise<string> {
  if (type === "none") return URL.createObjectURL(file);

  let mime = "image/webp";
  if (type === "webp") {
    mime = "image/webp";
  } else if (type === "jpg") {
    mime = "image/jpeg";
  }

  const img = new Image();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const reader = new FileReader();

  const p = new Promise<string>((resolve, reject) => {
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL(mime);
      resolve(dataURL);
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
  const config: Settings = JSON.parse(localStorage.getItem("settings") || "{}");

  for (const file of files) {
    const converted = await convert(file, config.convert);
    const key = genKey(file, config.convert);
    const response = (await $fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: "Bearer " + config.token,
      },
      body: { key: key, dataUrl: converted },
    })) as { statusCode: number; body: string; link?: string };
    console.log(response);
    if (response.statusCode === 200) {
      toast.add({
        severity: "info",
        summary: "Success",
        detail: "File Uploaded",
        life: 3000,
      });
      uploadedLinks.value.push({
        link: response.link as string,
        name: file.name,
      });
    } else if (response.statusCode === 500) {
      console.error(response.body);
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "File Upload Failed",
        life: 3000,
      });
    }
  }
};
</script>
