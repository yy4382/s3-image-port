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
import imageCompression from "browser-image-compression";
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
  keyTemplate: "",
  convertType: "none",
  compressionMaxSize: "",
  compressionMaxWidthOrHeight: "",
} satisfies AppSettings);

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
  const keyTemplate =
    appConfig.value.keyTemplate === undefined ||
    appConfig.value.keyTemplate.trim().length === 0
      ? defaultKeyTemplate
      : appConfig.value.keyTemplate.trim();
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
  return keyTemplate.replace(/{{(.*?)}}/g, (match, key) => data[key] || match);
}

async function compressImg(file: File): Promise<File> {
  let fileType = file.type;
  switch (appConfig.value.convertType) {
    case "none":
      break;
    case "webp":
      fileType = "image/webp";
      break;
    case "jpg":
      fileType = "image/jpeg";
      break;
  }
  console.log(appConfig.value.compressionMaxSize || undefined);
  const compressedFile = await imageCompression(file, {
    maxSizeMB: appConfig.value.compressionMaxSize || undefined,
    maxWidthOrHeight: appConfig.value.compressionMaxWidthOrHeight || undefined,
    useWebWorker: true,
    fileType,
  });
  console.log(
    `File compressed from ${file.size} to ${compressedFile.size},\n` +
      `from ${file.type} to ${compressedFile.type}`
  );
  return compressedFile;
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
    const compressed = await compressImg(file);
    const key = genKey(file, appConfig.value.convertType);

    try {
      await uploadObj(compressed, key, s3Config.value);
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
