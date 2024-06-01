<template>
  <div class="space-y-2">
    <UploadDropZone />
    <div v-if="uploadStore.length !== 0" class="space-y-2">
      <div class="flex flex-wrap gap-2">
        <UploadPreviewBar
          v-for="(key, index) of uploadStore.keys"
          :key="key"
          :index="index"
          @remove="removeFileData"
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
const removeFileData = (index: number) => {
  uploadStore.remove(index);
};

const upload = async () => {
  uploading.value = true;

  // TODO: localize the toast messages
  toast.add({
    title: "Uploading...",
    description: "Please wait...",
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
