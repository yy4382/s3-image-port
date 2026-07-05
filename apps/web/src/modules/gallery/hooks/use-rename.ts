import {
  createS3ImageStorage,
  type CreateImageStorageFromSettings,
} from "@/modules/image-storage";
import { validS3SettingsAtom } from "@/stores/atoms/settings";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { useFetchPhotoList } from "./use-photo-list";
import { selectedPhotosAtom } from "@/stores/atoms/gallery";

export function useRenamePhoto(
  createStorage: CreateImageStorageFromSettings = createS3ImageStorage,
) {
  const setSelectedPhotos = useSetAtom(selectedPhotosAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const { fetchPhotoList } = useFetchPhotoList(createStorage);
  const tControl = useTranslations("gallery.control");
  const t = useTranslations("gallery.item.options.renameMessages");

  const handleRename = useCallback(
    async (oldKey: string, newKey: string, force = false) => {
      if (!s3Settings) {
        toast.error(tControl("s3SettingsNotFound"));
        return { success: false, error: "s3SettingsNotFound" };
      }

      // Validation
      if (!newKey || newKey.trim() === "") {
        toast.error(t("invalidKey"));
        return { success: false, error: "invalidKey" };
      }

      if (newKey === oldKey) {
        toast.error(t("sameKey"));
        return { success: false, error: "sameKey" };
      }

      try {
        toast.message(t("requesting"));

        const result = await createStorage(s3Settings).renameStoredImage({
          oldKey,
          newKey,
          overwrite: force,
        });
        if (!result.ok) {
          console.error("Failed to rename photo", result.error);
          switch (result.error.reason) {
            case "already-exists":
              toast.error(t("objectExists"));
              return { success: false, error: "already-exists" };
            case "partial-rename":
              toast.warning(t("partialSuccess"));
              await fetchPhotoList({ toastLevel: "error" });
              return { success: false, error: "partial-rename" };
            default:
              toast.error(t("failed"));
              return { success: false, error: result.error.reason };
          }
        }

        toast.success(t("success"));

        // Update selected photos if the renamed photo was selected
        setSelectedPhotos((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(oldKey)) {
            newSet.delete(oldKey);
            newSet.add(newKey);
          }
          return newSet;
        });

        // Fetch the photo list again to reflect the change
        await fetchPhotoList({ toastLevel: "error" });

        return { success: true };
      } catch (error: unknown) {
        console.error("Failed to rename photo", error);

        toast.error(t("failed"));
        return { success: false, error: "unknown" };
      }
    },
    [s3Settings, fetchPhotoList, t, tControl, setSelectedPhotos, createStorage],
  );

  return handleRename;
}
