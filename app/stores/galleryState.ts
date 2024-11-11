import { sub } from "date-fns";
import { defineStore, acceptHMRUpdate } from "pinia";
import type { Photo } from "~/types";
import filter from "~/utils/filterImages";

export const useGalleryStateStore = defineStore("galleryState", () => {
  const settings = useSettingsStore();

  const toast = useToast();
  const { t } = useI18n();
  const localePath = useLocalePath();
  /**
   * All photos fetched from S3
   */
  const imageAll = useLocalStorage<Photo[]>("s3-photos", []);
  const listImages = async () => {
    const toastId = Math.random().toString();
    toast.add({
      id: toastId,
      title: t("photos.message.listPhotos.try.title"),
    });
    try {
      imageAll.value = await new ImageS3Client(settings.s3).list();
      toast.update(toastId, {
        title: t("photos.message.listPhotos.success.title"),
        timeout: 1200,
      });
    } catch (e) {
      console.error(e);
      toast.update(toastId, {
        title: t("photos.message.listPhotos.fail.title"),
        description: t("photos.message.listPhotos.fail.description"),
        actions: [
          {
            label: t("photos.message.listPhotos.fail.actions.retry"),
            click: listImages,
          },
          {
            label: t("photos.message.listPhotos.fail.actions.goToSettings"),
            click: () => navigateTo(localePath("/settings/s3")),
          },
        ],
        timeout: 7000,
      });
    }
  };

  const filterOptions = ref<FilterOptions>({
    searchTerm: "",
    prefix: "",
    dateRange: { start: sub(new Date(), { years: 1000 }), end: new Date() },
    sort: { by: "key", orderIsDesc: true },
  });

  /**
   * Filtered photos, updated by PhotoDisplayOptions
   */
  const imageFiltered = computed(() =>
    filter(imageAll.value, filterOptions.value, settings.app),
  );

  const imageDisplayed = ref<Photo[]>([]);

  const imageSelected = ref<string[]>([]);

  const clearSelectedPhotos = () => {
    imageSelected.value = [];
  };
  const selectDisplayedPhotos = () => {
    imageSelected.value = imageDisplayed.value.map((photo) => photo.Key);
  };

  async function deletePhoto(inputKeys?: string[]) {
    const keys = inputKeys ?? imageSelected.value;
    try {
      toast.add({ title: t("photos.message.deletePhoto.try.title") });
      await Promise.all(
        keys.map((key) => new ImageS3Client(settings.s3).delete(key)),
      );
      toast.add({ title: t("photos.message.deletePhoto.success.title") });
    } catch (error) {
      toast.add({ title: t("photos.message.deletePhoto.fail.title") });
      console.error((error as Error).message);
    } finally {
      clearSelectedPhotos();
      await listImages();
    }
  }

  return {
    imageAll,
    listImages,
    filterOptions,
    imageFiltered,
    imageDisplayed,
    imageSelected,
    clearSelectedPhotos,
    selectDisplayedPhotos,
    deletePhoto,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useGalleryStateStore, import.meta.hot),
  );
}
