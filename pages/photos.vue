<template>
  <UContainer class="w-full space-y-4">
    <ClientOnly>
      <div class="w-full flex flex-col-reverse gap-4">
        <div id="display-settings"></div>
        <div class="flex gap-4 justify-between">
          <div class="flex gap-2 items-center">
            <UButton
              icon="i-mingcute-refresh-2-line"
              :disabled="!settings.validity.s3"
              variant="outline"
              :loading="isLoading"
              @click="listPhotos"
            />

            <UButton
              v-if="selectedPhotos.length > 0"
              icon="i-mingcute-checkbox-line"
              :label="selectedPhotos.length + ''"
              variant="outline"
              color="gray"
              @click="clearSelectedPhotos"
            />
            <BaseSecondConfirm
              v-if="selectedPhotos.length > 0"
              :action="
                () => {
                  deletePhoto(selectedPhotos);
                  selectedPhotos.length = 0;
                }
              "
              danger
            >
              <UButton
                aria-label="Delete"
                :label="selectedPhotos.length + ''"
                icon="i-mingcute-delete-3-line"
                color="red"
                variant="outline"
                :disabled="!settings.validity.s3"
              />
            </BaseSecondConfirm>
          </div>
          <!-- prettier-ignore-attribute @update:photos-to-display -->
          <PhotoDisplayOptions
            :photos="photos"
            :enable-fuzzy-search="settings.app.enableFuzzySearch"
            :fuzzy-search-threshold="settings.app.fuzzySearchThreshold"
            @update:photos-to-display="(v) => { photosToDisplay = v; }"
          />
        </div>
      </div>
      <PhotoGrid
        ref="photoGridRef"
        v-model="selectedPhotos"
        :photos="photosToDisplay"
        @delete-photo="deletePhoto"
      />
    </ClientOnly>
  </UContainer>
</template>

<script setup lang="ts">
import type { Photo } from "~/types";
import { useStorage } from "@vueuse/core";
import type { PhotoGrid } from "#components";

const router = useRouter();
const toast = useToast();
const photos: Ref<Photo[]> = useStorage("s3-photos", []);

const settings = useSettingsStore();
const { t } = useI18n();
const localePath = useLocalePath();
const isLoading = ref(false);

/**
 * Filtered photos.
 *
 * Updated by PhotoDisplayOptions
 */
const photosToDisplay = ref<Photo[]>([]);

// selected related
const selectedPhotos = ref<string[]>([]);
const photoGridRef = ref<InstanceType<typeof PhotoGrid> | null>(null);
function clearSelectedPhotos() {
  photoGridRef.value?.clearSelectedPhotos();
}

onMounted(() => {
  if (!settings.validity.s3) {
    useWrongSettingToast("s3");
    console.error("Invalid S3 settings");
  }
  if (!settings.validity.app) {
    useWrongSettingToast("app");
    console.error("Invalid app settings");
  }
  if (settings.app.enableAutoRefresh) {
    listPhotos();
  }
});

async function listPhotos() {
  isLoading.value = true;
  try {
    toast.add({
      title: t("photos.message.listPhotos.try.title"),
    });
    photos.value = await settings.list();
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
// async function deletePhoto(key: string): Promise<void>;
async function deletePhoto(keyOrKeys: string | string[]) {
  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
  try {
    toast.add({ title: t("photos.message.deletePhoto.try.title") });
    await Promise.all(keys.map((key) => settings.del(key)));
    toast.add({ title: t("photos.message.deletePhoto.success.title") });
  } catch (error) {
    toast.add({ title: t("photos.message.deletePhoto.fail.title") });
    console.error((error as Error).message);
  } finally {
    selectedPhotos.value = [];
    await listPhotos();
  }
}
</script>
