import {
  createS3ImageStorage,
  type CreateImageStorageFromSettings,
} from "@/modules/image-storage";
import { validS3SettingsAtom } from "@/stores/atoms/settings";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

export function useDownloadPhoto(
  createStorage: CreateImageStorageFromSettings = createS3ImageStorage,
) {
  const s3Options = useAtomValue(validS3SettingsAtom);
  const tControl = useTranslations("gallery.control");
  const t = useTranslations("gallery.item.options.downloadMessages");

  const handleDownload = useCallback(
    async (key: string) => {
      if (!s3Options) {
        toast.error(tControl("s3SettingsNotFound"));
        return { success: false, error: "s3SettingsNotFound" };
      }

      try {
        const result = await createStorage(s3Options).downloadStoredImage(key);
        if (!result.ok) {
          toast.error(t("failed"));
          return { success: false, error: result.error.reason };
        }

        const url = URL.createObjectURL(result.value.body);
        const a = document.createElement("a");
        a.href = url;
        a.download = key;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t("started"));

        return { success: true };
      } catch (e) {
        console.error("Failed to download photo", e);
        toast.error(t("failed"));
        return { success: false, error: "unknown" };
      }
    },
    [s3Options, t, tControl, createStorage],
  );

  return handleDownload;
}
