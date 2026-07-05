import {
  createS3ImageStorage,
  type CreateImageStorageFromSettings,
  type ImageStorageFailure,
} from "@/modules/image-storage";
import { validS3SettingsAtom } from "@/stores/atoms/settings";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { useFetchPhotoList } from "./use-photo-list";
import { selectedPhotosAtom } from "@/stores/atoms/gallery";

export function useDeletePhotos(
  createStorage: CreateImageStorageFromSettings = createS3ImageStorage,
) {
  const setSelectedPhotos = useSetAtom(selectedPhotosAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const { fetchPhotoList } = useFetchPhotoList(createStorage);
  const t = useTranslations("gallery.control");

  const handleDelete = useCallback(
    async (photos: string[] | string) => {
      if (!s3Settings) {
        toast.error(t("s3SettingsNotFound"));
        return { success: false, error: "s3SettingsNotFound" } as const;
      }
      const keys = Array.isArray(photos) ? photos : [photos];
      let outcome:
        | { success: true }
        | { success: false; error: ImageStorageFailure["reason"] };
      try {
        toast.message(t("requestingDelete"));

        const result = await createStorage(s3Settings).deleteStoredImages(keys);
        if (result.ok) {
          toast.success(t("deleteSuccess"));
          outcome = { success: true };
        } else {
          toast.error(t("deleteFailed"));
          console.error("Failed to delete photos", result.error);
          outcome = { success: false, error: result.error.reason };
        }
      } catch (error) {
        toast.error(t("deleteFailed"));
        console.error("Failed to delete photos", error);
        outcome = { success: false, error: "unknown" };
      } finally {
        // remove deleted photos from the selected photos
        setSelectedPhotos((prev) => {
          const newSet = new Set(prev);
          keys.forEach((key) => newSet.delete(key));
          return newSet;
        });

        // fetch the photo list again
        await fetchPhotoList({ toastLevel: "error" });
      }
      return outcome;
    },
    [s3Settings, fetchPhotoList, t, setSelectedPhotos, createStorage],
  );

  return handleDelete;
}
