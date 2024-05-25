<template>
  <UContainer class="w-full space-y-4">
    <ClientOnly>
      <div class="w-full flex flex-col-reverse gap-4">
        <div id="display-settings"></div>
        <UForm class="flex gap-4 justify-between" :state="{}">
          <div class="flex gap-4 items-center">
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

            <UPopover v-if="selectedPhotos.length > 0" overlay>
              <UButton
                aria-label="Delete"
                :label="'Delete ' + selectedPhotos.length + ' Photos'"
                icon="i-mingcute-delete-3-line"
                color="red"
                :disabled="!validS3Setting"
              />
              <template #panel="{ close }">
                <div class="flex p-4 gap-3 items-center">
                  <div
                    class="text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {{ $t("photos.photoCard.deleteButton.confirm.title") }}
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0 mt-0">
                    <UButton
                      size="xs"
                      :label="
                        $t(
                          'photos.photoCard.deleteButton.confirm.actions.cancel',
                        )
                      "
                      color="gray"
                      @click="close()"
                    />
                    <UButton
                      size="xs"
                      :label="
                        $t(
                          'photos.photoCard.deleteButton.confirm.actions.confirm',
                        )
                      "
                      color="red"
                      @click="
                        selectedPhotos.forEach((key) => {
                          deletePhoto(key);
                        });
                        selectedPhotos.length = 0;
                        close();
                      "
                    />
                  </div>
                </div>
              </template>
            </UPopover>
          </div>
          <DisplayOptions
            v-model:date-range="dateRange"
            v-model:sort-by="sortBy"
            v-model:sort-order-is-descending="sortOrderIsDescending"
            v-model:search-term="searchTerm"
            v-model:prefix="prefix"
            :available-prefixes="availablePrefixes"
          />
        </UForm>
      </div>
      <div ref="imageWrapper" class="flex flex-wrap gap-4">
        <PhotoCard
          v-for="(photo, index) in currentDisplayed"
          :key="photo.Key"
          :photo="photo"
          :disabled="!validS3Setting"
          :style="{
            width: `${imageSize[index][0]}px`,
            height: `${imageSize[index][1]}px`,
          }"
          :selected="selectedPhotos.includes(photo.Key)"
          @delete-photo="deletePhoto"
          @image-loaded="
            (size) => {
              imageNaturalSize[index] = size;
            }
          "
        >
          <template #checkbox>
            <input
              :id="photo.Key"
              v-model="selectedPhotos"
              type="checkbox"
              :value="photo.Key"
            />
          </template>
        </PhotoCard>
      </div>
      <UPagination
        v-if="photosToDisplay.length > 0"
        v-model="page"
        class="mx-auto max-w-fit"
        :total="photosToDisplay.length"
        :page-count="imagePerPage"
      />
    </ClientOnly>
  </UContainer>
</template>

<script setup lang="ts">
import type { SortByOpts, Photo } from "~/types";
import { useStorage } from "@vueuse/core";
import { useFuse } from "@vueuse/integrations/useFuse";
import { sub, compareAsc, compareDesc } from "date-fns";

const router = useRouter();
const toast = useToast();
const photos: Ref<Photo[]> = useStorage("s3-photos", []);

const selectedPhotos = ref<string[]>([]);

const { s3Settings, appSettings, validS3Setting, validAppSetting } =
  useValidSettings();
const page = ref(1);
const imagePerPage = 16;
const { t } = useI18n();
const localePath = useLocalePath();
const isLoading = ref(false);
const searchTerm = ref("");
const debouncedSearchTerm = refDebounced(searchTerm, 300);
const imageWrapper = ref<HTMLElement | null>(null);

const availablePrefixes: ComputedRef<string[]> = computed(() => [
  "",
  ...new Set(
    photos.value.flatMap((photo) => {
      const parts = photo.Key.split("/");
      return parts
        .slice(0, -1)
        .map((_, index) => parts.slice(0, index + 1).join("/"));
    }),
  ),
]);

const prefix: Ref<string> = ref("");
const dateRange: Ref<{ start: Date; end: Date }> = ref({
  start: sub(new Date(), { years: 1000 }),
  end: new Date(),
});
const sortBy: Ref<SortByOpts> = ref("key");
const sortOrderIsDescending: Ref<boolean> = ref(true);

const filterByPrefix = (photos: Photo[], prefix: string) => {
  if (prefix === "") {
    return photos;
  }
  return photos.filter((photo) => photo.Key.startsWith(prefix));
};

const filterByDate = (
  photos: Photo[],
  dateRange: { start: Date; end: Date },
) => {
  return photos.filter((photo) => {
    const date = new Date(photo.LastModified);
    return date >= dateRange.start && date <= dateRange.end;
  });
};

const photosToDisplay = computed(() => {
  const photosFilteredByPrefixAndDate = filterByDate(
    filterByPrefix(photos.value, prefix.value),
    dateRange.value,
  );

  if (debouncedSearchTerm.value.trim() === "") {
    // Sort related options are only available when search term is empty
    if (sortBy.value === "key") {
      return photosFilteredByPrefixAndDate.sort((a, b) =>
        !sortOrderIsDescending.value
          ? a.Key.localeCompare(b.Key)
          : b.Key.localeCompare(a.Key),
      );
    } else {
      return photosFilteredByPrefixAndDate.sort((a, b) =>
        !sortOrderIsDescending.value
          ? compareAsc(new Date(a.LastModified), new Date(b.LastModified))
          : compareDesc(new Date(a.LastModified), new Date(b.LastModified)),
      );
    }
  }

  if (appSettings.value.enableFuzzySearch) {
    const { results } = useFuse(
      debouncedSearchTerm.value,
      photosFilteredByPrefixAndDate.map((photo) => photo.Key),
      {
        fuseOptions: {
          threshold: appSettings.value.fuzzySearchThreshold,
          useExtendedSearch: true,
        },
      },
    );
    const keys = results.value.map((result) => result.item);
    const searchResultPhotos = photosFilteredByPrefixAndDate.filter((photo) =>
      keys.includes(photo.Key),
    );
    return searchResultPhotos.sort(
      (a, b) => keys.indexOf(a.Key) - keys.indexOf(b.Key),
    );
  } else {
    return photosFilteredByPrefixAndDate.filter((photo) =>
      photo.Key.includes(debouncedSearchTerm.value.trim()),
    );
  }
});

const currentDisplayed = computed(() =>
  photosToDisplay.value.slice(
    (page.value - 1) * imagePerPage,
    page.value * imagePerPage,
  ),
);

const defaultImageSize: [number, number] = [384, 208];
const gap = 16;

const imageNaturalSize = ref<[number, number][]>(
  Array.from({ length: imagePerPage }, () => defaultImageSize),
);
const deBouncedImageNaturalSize = useDebounce(imageNaturalSize, 300);

const wrapperWidth = useElementSize(imageWrapper).width;
useResizeObserver(imageWrapper, (entries) => {
  const entry = entries[0];
  const { width } = entry.contentRect;
  wrapperWidth.value = width;
});
const deBouncedWrapperWidth = useDebounce(wrapperWidth, 100);

const imageSize = useMasonry(deBouncedImageNaturalSize, deBouncedWrapperWidth, {
  gap,
  defaultSize: defaultImageSize,
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
