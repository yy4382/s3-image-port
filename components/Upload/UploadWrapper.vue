<template>
  <div class="space-y-2">
    <UploadDropZone />
    <div v-if="uploadStore.length !== 0" class="space-y-2">
      <div class="flex flex-wrap gap-2">
        <UploadPreviewBar
          v-for="(file, index) of uploadStore.files"
          :key="file.name"
          :index="index"
        />
      </div>
      <UButton
        :label="$t('upload.fileUploader.uploadButton')"
        variant="outline"
        :loading="uploading"
        :disabled="!settings.validity.all"
        block
        @click="upload"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UploadedFileLinkObj } from "~/types";

const { t } = useI18n();
const settings = useSettingsStore();
const localePath = useLocalePath();
const router = useRouter();
const toast = useToast();
const uploadedLinks = defineModel("uploadedLinks", {
  type: Array as PropType<UploadedFileLinkObj[]>,
  default: [],
});
const uploading = ref(false);
const uploadStore = useUploadStore();

const upload = async () => {
  uploading.value = true;

  toast.add({
    title: t("upload.message.uploadStarted.title"),
    description: t("upload.message.uploadStarted.description"),
  });

  uploadStore.upload((key, name, success) => {
    debug(key, name, success);
    if (success) {
      toast.add({
        title: t("upload.message.uploaded.title"),
        description: key,
      });
      uploadedLinks.value.push({
        link: settings.key2Url(key),
        name: name,
      });
      uploadStore.reset();
    } else {
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
  });
  uploading.value = false;
};
</script>
