<template>
  <UContainer class="space-y-4">
    <ClientOnly>
      <div class="flex gap-4 justify-between">
        <UButton
          :label="
            photos.length === 0
              ? $t('photos.loadOrRefreshButton.loadButton')
              : $t('photos.loadOrRefreshButton.refreshButton')
          "
          :disabled="!validS3Setting"
          variant="outline"
          :loading="isLoading"
          @click="listPhotos"
        />
        <UInput
          v-model="searchTerm"
          icon="i-heroicons-magnifying-glass-20-solid"
          placeholder="Search..."
        />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <!--TODO: handle pagination-->
        <div
          v-for="photo in photosToDisplay.slice((page - 1) * 9, page * 9)"
          :key="photo.Key"
        >
          <PhotoCard
            :photo="photo"
            :disabled="!validS3Setting"
            @delete-photo="deletePhoto"
          />
        </div>
      </div>
      <UPagination
        v-if="photos.length > 0"
        v-model="page"
        class="mx-auto max-w-fit"
        :total="photos.length"
        :per-page="9"
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
const { s3Settings, appSettings, validS3Setting, validAppSetting } =
  useValidSettings();
const page = ref(1);
const { t } = useI18n();
const localePath = useLocalePath();
const isLoading = ref(false);
const searchTerm = ref("");
const photosToDisplay = computed(() => {
  if (searchTerm.value === "") {
    return photos.value;
  }
  return photos.value.filter((photo) =>
    photo.Key.toLowerCase().includes(searchTerm.value.toLowerCase())
  );
});

onMounted(() => {
  if (!validS3Setting.value) {
    useWrongSettingToast("s3");
    console.error("Invalid S3 settings");
  }
  if (!validAppSetting.value) {
    useWrongSettingToast("app");
    console.error("Invalid app settings");
  }
  if (appSettings.value.enableAutoRefresh) {
    listPhotos();
  }
});

async function listPhotos() {
  isLoading.value = true;
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
  isLoading.value = false;
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
