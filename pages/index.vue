<template>
  <UContainer class="space-y-8">
    <form @submit="uploadHandler" class="space-y-4">
      <UInput type="file" multiple id="file" />
      <UButton type="submit">Upload</UButton>
    </form>
    <UTabs
      v-if="uploadedLinksFormatted.length > 0"
      :items="[
        { key: 'links', label: 'Link' },
        { key: 'markdown', label: 'Markdown' },
      ]"
    >
      <template #item="{ item }">
        <UCard>
          <ul class="space-y-3">
            <li v-for="link in uploadedLinksFormatted" :key="link.link">
              <ULink :to="link.link" target="_blank">{{
                ((key, link) => {
                  switch (key) {
                    case 'links':
                      return link.link;
                    case 'markdown':
                      return link.markdown;
                  }
                })(item.key, link)
              }}</ULink>
            </li>
          </ul>
        </UCard>
      </template>
    </UTabs>
  </UContainer>
</template>

<script setup lang="ts">
import { DateTime, Interval } from "luxon";
import { useStorage } from "@vueuse/core";
import { type S3Config, type AppSettings } from "~/types";
interface ImageLink {
  link: string;
  name: string;
}
const toast = useToast();
const uploadedLinks: Ref<ImageLink[]> = ref([]);
const uploadedLinksFormatted = computed(() =>
  uploadedLinks.value.map((link) => ({
    link: link.link,
    markdown: `![${link.name}](${link.link})`,
  }))
);

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
  return "i/" + DateTime.now().toFormat("yyyy/LL/dd") + "/" + filename;
}

async function convert(file: File, type: string): Promise<File> {
  if (type === "none") return file; //!TODO wrong mime type application/octet-stream

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

  const p = new Promise<File>((resolve, reject) => {
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Blob is null, could not convert to File."));
          return;
        }
        const out_file = new File([blob], file.name, { type: mime });
        resolve(out_file);
      }, mime);
    };

    img.onerror = () => reject(new Error("Error loading image"));
  });

  reader.readAsDataURL(file);
  return p;
}

const uploadHandler = async (e: any) => {
  e.preventDefault();
  const files = e.target?.elements["file"].files as File[];
  const s3Config = useStorage<S3Config>("s3-settings", {} as S3Config);
  const appConfig = useStorage<AppSettings>("app-settings", {
    convertType: "none",
  } as AppSettings);

  for (const file of files) {
    const converted = await convert(file, appConfig.value.convertType);
    const key = genKey(file, appConfig.value.convertType);
    try {
      await uploadObj(converted, key, s3Config.value);
      toast.add({
        title: "File Uploaded: " + key,
      });
      uploadedLinks.value.push({
        link: key2Url(key, s3Config.value),
        name: file.name,
      });
    } catch (e) {
      console.error(e);
      toast.add({
        title: "File Upload Failed: " + key,
      });
    }
  }
};
</script>
