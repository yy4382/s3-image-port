import { defineStore, acceptHMRUpdate } from "pinia";
import type { Photo } from "~/types";

export const useGalleryStateStore = defineStore("galleryState", () => {
  const settings = useSettingsStore();

  const toast = useToast();
  const { t } = useI18n();
  const router = useRouter();
  const localePath = useLocalePath();
  /**
   * All photos fetched from S3
   */
  const imageAll = useLocalStorage<Photo[]>("s3-photos", []);
  const listImages = async () => {
    toast.add({
      title: t("photos.message.listPhotos.try.title"),
    });
    try {
      imageAll.value = await new ImageS3Client(settings.s3).list();
      toast.add({
        title: t("photos.message.listPhotos.success.title"),
      });
    } catch (e) {
      console.error(e);
      toast.add({
        title: t("photos.message.listPhotos.fail.title"),
        description: t("photos.message.listPhotos.fail.description"),
        actions: [
          {
            label: t("photos.message.listPhotos.fail.actions.retry"),
            click: listImages,
          },
          {
            label: t("photos.message.listPhotos.fail.actions.goToSettings"),
            click: () => router.push(localePath("/settings")),
          },
        ],
      });
    }
  };

  /**
   * Filtered photos, updated by PhotoDisplayOptions
   */
  const imageFiltered = ref<Photo[]>([]);

  const imageDisplayed = ref<Photo[]>([]);

  const imageSelected = ref<string[]>([]);

  const clearSelectedPhotos = () => {
    imageSelected.value = [];
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
    imageFiltered,
    imageDisplayed,
    imageSelected,
    clearSelectedPhotos,
    deletePhoto,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useGalleryStateStore, import.meta.hot),
  );
}
