import ImageS3Client from "@/lib/utils/ImageS3Client";
import { validS3SettingsAtom } from "@/modules/settings/settings-store";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { useFetchPhotoList } from "./use-photo-list";
import { selectedPhotosAtom } from "./use-select";

export function useRenamePhoto() {
  const setSelectedPhotos = useSetAtom(selectedPhotosAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const { fetchPhotoList } = useFetchPhotoList();
  const t = useTranslations("gallery.control");

  const handleRename = useCallback(
    async (oldKey: string, newKey: string, force = false) => {
      if (!s3Settings) {
        toast.error(t("s3SettingsNotFound"));
        return { success: false, error: "s3SettingsNotFound" };
      }

      // Validation
      if (!newKey || newKey.trim() === "") {
        toast.error(t("renameInvalidKey"));
        return { success: false, error: "invalidKey" };
      }

      if (newKey === oldKey) {
        toast.error(t("renameSameKey"));
        return { success: false, error: "sameKey" };
      }

      try {
        toast.message(t("requestingRename"));

        await new ImageS3Client(s3Settings).rename(oldKey, newKey, force);

        toast.success(t("renameSuccess"));

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
        await fetchPhotoList(false);

        return { success: true };
      } catch (error: unknown) {
        console.error("Failed to rename photo", error);

        // Parse specific error messages
        if (error instanceof Error) {
          if (error.message.includes("Object already exists")) {
            toast.error(t("renameObjectExists"));
            return { success: false, error: "objectExists" };
          }
          if (error.message.includes("failed to delete old key")) {
            toast.warning(t("renamePartialSuccess"));
            await fetchPhotoList(false);
            return { success: false, error: "partialSuccess" };
          }
        }

        toast.error(t("renameFailed"));
        return { success: false, error: "unknown" };
      }
    },
    [s3Settings, fetchPhotoList, t, setSelectedPhotos],
  );

  return handleRename;
}
