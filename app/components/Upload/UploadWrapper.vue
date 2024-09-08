<template>
  <div class="space-y-2">
    <UploadDropZone v-model="fileList" />
    <UProgress
      v-if="showProgress"
      :value="uploadProgress"
      :max="uploadProgressMax"
    />
    <div v-if="fileList.length !== 0" class="space-y-2">
      <div class="flex flex-col w-full gap-2">
        <UploadPreviewBar
          v-for="(file, index) of fileList"
          :key="file.name"
          ref="previewBars"
          class="transition-all"
          :file
          @delete-file="
            () => {
              fileList.splice(index, 1);
            }
          "
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
import { type UploadPreviewBar } from "#components";

const { t } = useI18n();
const settings = useSettingsStore();
const localePath = useLocalePath();
const toast = useToast();
const uploadedLinks = defineModel("uploadedLinks", {
  type: Array as PropType<UploadedFileLinkObj[]>,
  default: [],
});
const uploading = ref(false);

const fileList = ref<File[]>([]);
const previewBars = ref<InstanceType<typeof UploadPreviewBar>[] | null>(null);

const uploadProgress = ref(0);
const uploadProgressMax = ref(0);
const showProgress = ref(false);

const upload = async () => {
  uploading.value = true;
  uploadProgressMax.value = fileList.value.length;
  uploadProgress.value = 0;
  showProgress.value = true;

  toast.add({
    title: t("upload.message.uploadStarted.title"),
    description: t("upload.message.uploadStarted.description"),
  });

  const uploadPromises =
    previewBars.value?.map((previewBar) => {
      return previewBar.upload(() => {
        uploadProgress.value++;
      });
    }) ?? [];

  const uploadedStates = await Promise.all(uploadPromises);

  setTimeout(() => {
    showProgress.value = false;
  }, 3000);

  const failedUploads: typeof uploadedStates = [];

  // delete successful uploaded files
  uploadedStates.forEach((state) => {
    if (state.success) {
      const index = fileList.value.findIndex(
        (file) => file.name === state.name,
      );
      uploadedLinks.value.push({
        link: key2Url(state.key, settings.s3),
        name: state.name,
      });
      if (index !== -1) {
        fileList.value.splice(index, 1);
      }
    } else {
      failedUploads.push(state);
    }
  });

  if (failedUploads.length > 0) {
    toast.add({
      title: t("upload.message.uploadFailed.title"),
      description: failedUploads.map((state) => state.key).join(", "),
      actions: [
        {
          label: t("upload.message.uploadFailed.actions.goToSettings"),
          click: () => navigateTo(localePath("/settings/s3")),
        },
      ],
    });
  } else {
    toast.add({
      title: t("upload.message.uploaded.title"),
    });
  }
  uploading.value = false;
};
</script>
