<template>
  <UContainer class="w-full space-y-4">
    <ClientOnly>
      <div class="w-full flex flex-col-reverse gap-4">
        <div id="display-settings"></div>
        <UForm class="flex gap-4 justify-between" :state="{}">
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
          <DisplayOptions
            v-model:date-range="dateRange"
            v-model:sort-by="sortBy"
            v-model:sort-order="sortOrder"
            v-model:search-term="searchTerm"
            v-model:prefix="prefix"
            :available-prefixes="availablePrefixes"
          />
        </UForm>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
        v-if="photosToDisplay.length > 0"
        v-model="page"
        class="mx-auto max-w-fit"
        :total="photosToDisplay.length"
        :per-page="9"
      />
    </ClientOnly>
  </UContainer>
</template>

<script setup lang="ts">
import type { SortByOpts, SortOrderOpts, Photo } from "~/types";
import { useStorage } from "@vueuse/core";
import { useFuse } from "@vueuse/integrations/useFuse";
import { sub, compareAsc, compareDesc } from "date-fns";

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
const debouncedSearchTerm = refDebounced(searchTerm, 300);

const availablePrefixes: ComputedRef<string[]> = computed(() => [
  "",
  ...new Set(
    photos.value.flatMap((photo) => {
      // 将每一个可能的前缀提出，ru abc/def/ghi -> [ru, ru abc, ru abc/def, ru abc/def]
      const parts = photo.Key.split("/");
      return parts
        .slice(0, -1)
        .map((_, index) => parts.slice(0, index + 1).join("/"));
    })
  ),
]);

const prefix: Ref<string> = ref("");
const dateRange: Ref<{ start: Date; end: Date }> = ref({
  start: sub(new Date(), { years: 1000 }),
  end: new Date(),
});
const sortBy: Ref<SortByOpts> = ref("key");
const sortOrder: Ref<SortOrderOpts> = ref("desc");

const filterByPrefix = (photos: Photo[], prefix: string) => {
  if (prefix === "") {
    return photos;
  }
  return photos.filter((photo) => photo.Key.startsWith(prefix));
};

const filterByDate = (
  photos: Photo[],
  dateRange: { start: Date; end: Date }
) => {
  return photos.filter((photo) => {
    const date = new Date(photo.LastModified);
    return date >= dateRange.start && date <= dateRange.end;
  });
};

const photosToDisplay = computed(() => {
  const filteredByPrefix = filterByPrefix(photos.value, prefix.value);
  const filteredByDate = filterByDate(filteredByPrefix, dateRange.value);
  if (debouncedSearchTerm.value === "") {
    // Sort related options are only available when search term is empty
    if (sortBy.value === "key") {
      return filteredByDate.sort((a, b) =>
        sortOrder.value === "asc"
          ? a.Key.localeCompare(b.Key)
          : b.Key.localeCompare(a.Key)
      );
    } else {
      return filteredByDate.sort((a, b) =>
        sortOrder.value === "asc"
          ? compareAsc(new Date(a.LastModified), new Date(b.LastModified))
          : compareDesc(new Date(a.LastModified), new Date(b.LastModified))
      );
    }
  }
  const { results } = useFuse(
    debouncedSearchTerm.value,
    photos.value.map((photo) => photo.Key),
    {
      fuseOptions: {
        threshold: 0.4,
      },
    }
  );
  const keys = results.value.map((result) => result.item);
  const filteredPhotos = photos.value.filter((photo) =>
    keys.includes(photo.Key)
  );
  return filteredPhotos.sort(
    (a, b) => keys.indexOf(a.Key) - keys.indexOf(b.Key)
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
