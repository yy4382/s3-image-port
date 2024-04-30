<template>
  <UContainer class="space-y-8">
    <UContainer>
      <form @submit.prevent="uploadHandler" class="flex gap-2">
        <UInput type="file" multiple id="file" accept="image/*" />
        <UButton type="submit" variant="outline" :loading="uploading">{{
          $t("upload.fileUploader.uploadButton")
        }}</UButton>
      </form>
    </UContainer>
    <UTabs
      v-if="uploadedLinksFormatted.length > 0"
      :items="[
        { slot: 'links', label: $t('upload.uploadedLinks.pureLink.title') },
        { slot: 'markdown', label: $t('upload.uploadedLinks.markdown.title') },
      ]"
    >
      <template #links>
        <UCard>
          <ul class="space-y-3">
            <li v-for="link in uploadedLinksFormatted" :key="link.link">
              <UseClipboard :source="link.link" v-slot="{ copy }">
                <UButton
                  color="black"
                  variant="link"
                  @click="
                    copy() && toast.add({ title: $t('upload.message.copied') })
                  "
                >
                  {{ link.link }}
                </UButton>
              </UseClipboard>
            </li>
          </ul>
        </UCard>
      </template>
      <template #markdown>
        <UCard>
          <ul class="space-y-3">
            <li v-for="link in uploadedLinksFormatted" :key="link.markdown">
              <UseClipboard :source="link.markdown" v-slot="{ copy }">
                <UButton
                  color="black"
                  variant="link"
                  @click="
                    copy() && toast.add({ title: $t('upload.message.copied') })
                  "
                >
                  {{ link.markdown }}
                </UButton>
              </UseClipboard>
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
import { UseClipboard } from "@vueuse/components";
import { type S3Config, type AppSettings } from "~/types";
interface ImageLink {
  link: string;
  name: string;
}
const router = useRouter();
const toast = useToast();
const uploadedLinks: Ref<ImageLink[]> = ref(
  import.meta.env.DEV
    ? [{ link: "https://example.com/abc.png", name: "abc.png" }]
    : []
);
const uploadedLinksFormatted = computed(() =>
  uploadedLinks.value.map((link) => ({
    link: link.link,
    markdown: `![${link.name}](${link.link})`,
  }))
);
const uploading = ref(false);

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
  uploading.value = true;
  e.preventDefault();
  const files = e.target?.elements["file"].files as File[];
  const s3Config = useStorage<S3Config>("s3-settings", {} as S3Config);
  const appConfig = useStorage<AppSettings>("app-settings", {
    convertType: "none",
  } as AppSettings);

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      toast.add({
        title: "File type not supported",
        description: file.type,
      });
      continue;
    }
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
        title: "File Upload Failed",
        description: key,
        actions: [
          { label: "Go to settings", click: () => router.push("/settings") },
        ],
      });
    }
  }
  uploading.value = false;
};
</script>
