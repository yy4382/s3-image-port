import ImageS3Client from "@/lib/utils/ImageS3Client";
import { validS3SettingsAtom } from "@/modules/settings/settings-store";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { useFetchPhotoList, setGalleryDirtyAtom } from "./use-photo-list";
import { selectedPhotosAtom } from "./use-select";

export function useDeletePhotos() {
  const setSelectedPhotos = useSetAtom(selectedPhotosAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const { fetchPhotoList } = useFetchPhotoList();
  const t = useTranslations("gallery.control");
  const setGalleryDirty = useSetAtom(setGalleryDirtyAtom);

  const handleDelete = useCallback(
    async (photos: string[] | string) => {
      if (!s3Settings) {
        toast.error(t("s3SettingsNotFound"));
        return;
      }
      try {
        toast.message(t("requestingDelete"));

        // because the photo list is always re-fetched in the finally block,
        // there's no need to set the gallery dirty status here
        if (Array.isArray(photos)) {
          await Promise.all(
            photos.map(async (key) => {
              await new ImageS3Client(s3Settings).delete(key);
            }),
          );
        } else {
          await new ImageS3Client(s3Settings).delete(photos);
        }
        toast.success(t("deleteSuccess"));
      } catch (error) {
        toast.error(t("deleteFailed"));
        console.error("Failed to delete photos", error);
      } finally {
        // remove deleted photos from the selected photos
        setSelectedPhotos((prev) => {
          const newSet = new Set(prev);
          if (Array.isArray(photos)) {
            photos.forEach((key) => newSet.delete(key));
          } else {
            newSet.delete(photos);
          }
          return newSet;
        });

        setGalleryDirty();
        // fetch the photo list again
        await fetchPhotoList();
      }
    },
    [s3Settings, fetchPhotoList, t, setSelectedPhotos, setGalleryDirty],
  );

  return handleDelete;
}
