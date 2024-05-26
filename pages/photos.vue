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
                :label="selectedPhotos.length + ''"
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
                        deletePhoto(selectedPhotos);
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
      <div ref="imageWrapper" class="flex flex-wrap gap-2">
        <PhotoCard
          v-for="(photo, index) in currentDisplayed"
          :key="photo.Key"
          ref="photoCardRefs"
          :photo="photo"
          :disabled="!validS3Setting"
          :style="{
            width: `${imageSize[index][0]}px`,
            height: `${imageSize[index][1]}px`,
          }"
          @delete-photo="deletePhoto"
        />
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
import { PhotoCard } from "#components";
import { z } from "zod";

const router = useRouter();
const toast = useToast();
const photos: Ref<Photo[]> = useStorage("s3-photos", []);

const { s3Settings, appSettings, validS3Setting, validAppSetting } =
  useValidSettings();
const page = ref(1);
const imagePerPage = 16;
const { t } = useI18n();
const localePath = useLocalePath();
const isLoading = ref(false);
const searchTerm = ref("");
const debouncedSearchTerm = refDebounced(searchTerm, 300);

// template refs
const photoCardRefs = ref<(InstanceType<typeof PhotoCard> | null)[]>([]);
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

// selected related
const selectedPhotos = ref<string[]>([]);
watchEffect(() => {
  selectedPhotos.value = photoCardRefs.value
    .filter((ref) => ref?.selected)
    .map((ref) => ref?.key)
    .filter((keyOrUd) => keyOrUd !== undefined) as string[];
});

/**
 * Brief explanation of the following masonry layout
 *
 * First, the calculation is encapsulated in the composable `useMasonry`.
 * The most important param it takes is an array of image natural sizes, which
 * should be sorted in the same order as the images in the DOM.
 *
 * And actually, the hardest part is to get the responsive size of the images.
 * I encountered many counterintuitive behaviors in reactive part of Vue.
 * Finally, my choice is to ask child components to calculate their own natural
 * sizes (need to be reactive; watching it from parent component don't work for
 * unknown reason) and expose them to parent components.
 * Then the watchEffect hook in this component will collect the natural sizes they
 * exposed, sort (because the order of ref array in v-for is not guaranteed
 * to be the same as dom), give them default size if they are not ready, and
 * pass them to the `useMasonry` composable.
 *
 * Another notable part is that the watchEffect must watch the `currentDisplayed`,
 * because when images are just added or deleted, the natural sizes of child
 * components are not changed, but the place they should be in the list is changed.
 */

type Size = [number, number];
const defaultImageSize: Size = [384, 208];
const gap = 8;

const wrapperWidth = useElementSize(imageWrapper).width;
useResizeObserver(imageWrapper, (entries) => {
  const entry = entries[0];
  const { width } = entry.contentRect;
  wrapperWidth.value = width;
});
const deBouncedWrapperWidth = refDebounced(wrapperWidth, 50);

// Calculate the natural size of images

const imageNaturalSize = ref<Size[]>(
  Array.from({ length: imagePerPage }, () => defaultImageSize),
);
const deBouncedImageNaturalSize = refDebounced(imageNaturalSize, 300);

// update imageNaturalSize when currentDisplayed or child components' state changes
watchEffect(() => {
  // sort the refs in the same order as the photos in the DOM
  const sortedPhotoCardRefs = currentDisplayed.value.map((photo) => {
    return photoCardRefs.value.find((ref) => ref?.key === photo.Key);
  });
  // get the natural size of each image, if not ready, returns default size
  const sizes: Size[] = sortedPhotoCardRefs.map((ref) => {
    return ref?.naturalSize ?? defaultImageSize;
  });
  try {
    imageNaturalSize.value = z
      .tuple([z.number(), z.number()])
      .array()
      .parse(sizes);
  } catch (error) {
    console.error((error as z.ZodError).errors);
  }
});

const imageSize = useMasonry(deBouncedImageNaturalSize, deBouncedWrapperWidth, {
  gap,
  defaultSize: defaultImageSize,
  maxItems: imagePerPage,
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
// async function deletePhoto(key: string): Promise<void>;
async function deletePhoto(keyOrKeys: string | string[]) {
  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
  try {
    toast.add({ title: t("photos.message.deletePhoto.try.title") });
    await Promise.all(keys.map((key) => deleteObj(key, s3Settings.value)));
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
