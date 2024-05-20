<template>
  <div class="space-y-2">
    <DropZone v-model:files-data="filesData" />
    <div v-if="filesData.length !== 0" class="space-y-2">
      <div class="flex flex-wrap gap-2">
        <FileBar
          v-for="fileData of filesData"
          :key="fileData.name"
          :file="fileData"
          @remove="removeFileData"
        />
      </div>
      <UButton
        :label="$t('upload.fileUploader.uploadButton')"
        variant="outline"
        :loading="uploading"
        :disabled="!validS3Setting || !validAppSetting"
        block
        @click="upload"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UploadedFileLinkObj } from "~/types";

const { t } = useI18n();
const { s3Settings, appSettings, validS3Setting, validAppSetting } =
  useValidSettings();
const localePath = useLocalePath();
const router = useRouter();
const toast = useToast();
const uploadedLinks = defineModel("uploadedLinks", {
  type: Array as PropType<UploadedFileLinkObj[]>,
  default: [],
});
const uploading = ref(false);
const filesData = ref<File[]>([]);
const removeFileData = (fileToRemove: File) => {
  filesData.value = filesData.value.filter((file) => file !== fileToRemove);
};

const upload = async () => {
  uploading.value = true;
  for (const file of filesData.value) {
    const key = genKey(file, appSettings.value.convertType);
    const compressedFile = await compressAndConvert(file);

    try {
      await uploadObj(compressedFile, key, s3Settings.value);
      removeFileData(file);
      toast.add({
        title: t("upload.message.uploaded.title"),
        description: key,
      });
      uploadedLinks.value.push({
        link: key2Url(key, s3Settings.value),
        name: file.name,
      });
    } catch (e) {
      // console.error(e);
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
