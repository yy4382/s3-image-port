import ImageS3Client from "@/lib/s3/image-s3-client";
import { validS3SettingsAtom } from "@/stores/atoms/settings";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { livePhotoPairingAtom, useFetchPhotoList } from "./use-photo-list";
import { selectedPhotosAtom } from "@/stores/atoms/gallery";

export function useDeletePhotos() {
  const setSelectedPhotos = useSetAtom(selectedPhotosAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const { videoByImageKey } = useAtomValue(livePhotoPairingAtom);
  const { fetchPhotoList } = useFetchPhotoList();
  const t = useTranslations("gallery.control");

  const handleDelete = useCallback(
    async (photos: string[] | string) => {
      if (!s3Settings) {
        toast.error(t("s3SettingsNotFound"));
        return;
      }
      // Deleting a Live Photo still must also delete its motion video,
      // otherwise the bare `.mov` is left orphaned in the bucket.
      const keys = new Set(Array.isArray(photos) ? photos : [photos]);
      for (const key of [...keys]) {
        const video = videoByImageKey.get(key);
        if (video) keys.add(video.Key);
      }
      try {
        toast.message(t("requestingDelete"));

        // because the photo list is always re-fetched in the finally block,
        // there's no need to set the gallery dirty status here
        await Promise.all(
          [...keys].map(async (key) => {
            await new ImageS3Client(s3Settings).delete(key);
          }),
        );
        toast.success(t("deleteSuccess"));
      } catch (error) {
        toast.error(t("deleteFailed"));
        console.error("Failed to delete photos", error);
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
    },
    [s3Settings, videoByImageKey, fetchPhotoList, t, setSelectedPhotos],
  );

  return handleDelete;
}
