<template>
  <UContainer class="space-y-4">
    <ClientOnly>
      <UButton
        :label="
          photos.length === 0
            ? $t('photos.loadOrRefreshButton.loadButton')
            : $t('photos.loadOrRefreshButton.refreshButton')
        "
        :disabled="!validS3Setting"
        @click="listPhotos"
        variant="outline"
      />
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div v-for="photo in photos.slice((page - 1) * 9, page * 9)">
          <PhotoCard
            :photo="photo"
            @delete-photo="deletePhoto"
            :disabled="!validS3Setting"
          />
        </div>
      </div>
      <UPagination
        class="mx-auto max-w-fit"
        v-model="page"
        :total="photos.length"
        :perPage="9"
        v-if="photos.length > 0"
      />
    </ClientOnly>
  </UContainer>
</template>

<script setup lang="ts">
import { type Photo } from "~/types";
import { useStorage } from "@vueuse/core";

const router = useRouter();
const toast = useToast();
const photos: Ref<Photo[]> = useStorage("s3-photos", []);
const { s3Settings, validS3Setting } = useValidSettings();
const page = ref(1);
const { t } = useI18n();
const localePath = useLocalePath();

onMounted(() => {
  if (!validS3Setting.value) {
    useWrongSettingToast("s3");
    console.error("Invalid S3 settings");
  }
});

async function listPhotos() {
  try {
    toast.add({
      title: t("photos.message.listPhotos.try.title"),
    });
    photos.value = (await listObj(s3Settings.value)).reverse();
    toast.add({
      title: t("photos.message.listPhotos.success.title"),
    });
  } catch (error) {
    toast.add({
      title: t("photos.message.listPhotos.fail.title"),
      description: t("photos.message.listPhotos.fail.description"),
      actions: [
        {
          label: t("photos.message.listPhotos.fail.actions.retry"),
          click: listPhotos,
        },
        {
          label: t("photos.message.listPhotos.fail.actions.goToSettings"),
          click: () => router.push(localePath("/settings")),
        },
      ],
    });
    console.error((error as Error).message);
  }
}
async function deletePhoto(key: string) {
  try {
    toast.add({
      title: t("photos.message.deletePhoto.try.title"),
    });
    await deleteObj(key, s3Settings.value);
    toast.add({
      title: t("photos.message.deletePhoto.success.title"),
    });
    await listPhotos();
  } catch (error) {
    toast.add({
      title: t("photos.message.deletePhoto.fail.title"),
    });
    console.error((error as Error).message);
  }
}
</script>
