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
import { defaultKeyTemplate } from "~/utils/uploadObj";
interface ImageLink {
  link: string;
  name: string;
}

const router = useRouter();
const toast = useToast();
const { t } = useI18n();
const localePath = useLocalePath();
const s3Config = useStorage<S3Config>("s3-settings", {} as S3Config);
const appConfig = useStorage<AppSettings>("app-settings", {
  convertType: "none",
} as AppSettings);


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
  if (appConfig.value.keyTemplate.trim().length == 0) {
    appConfig.value.keyTemplate = defaultKeyTemplate;
  }
  const now = DateTime.now();
  const today_start = now.startOf("day");
  const interval = Interval.fromDateTimes(today_start, now);
  const data: Record<string, string> = {
    year: now.toFormat("yyyy"),
    month: now.toFormat("LL"),
    day: now.toFormat("dd"),
    filename: file.name.split(".").shift() || "",
    ext: type === "none" ? file.name.split(".").pop() || "" : type,
    random: `${interval.length("milliseconds").toString(36)}-${Math.random()
      .toString(36)
      .substring(2, 4)}`,
  };
  return appConfig.value.keyTemplate.replace(
    /{{(.*?)}}/g,
    (match, key) => data[key.trim()] || ""
  );
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

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      toast.add({
        title: t("upload.message.fileTypeNotSupported.title"),
        description: file.type,
      });
      continue;
    }
    const converted = await convert(file, appConfig.value.convertType);
    const key = genKey(file, appConfig.value.convertType);
    try {
      await uploadObj(converted, key, s3Config.value);
      toast.add({
        title: t("upload.message.uploaded.title"),
        description: key,
      });
      uploadedLinks.value.push({
        link: key2Url(key, s3Config.value),
        name: file.name,
      });
    } catch (e) {
      console.error(e);
      toast.add({
        title: t("upload.message.uploadFailed.title"),
        description: key,
        actions: [
          {
            label: t("upload.message.uploadFailed.actions.goToSettings"),
            click: () => router.push(localePath("/settings")),
          },
        ],
      });
    }
  }
  uploading.value = false;
};
</script>
