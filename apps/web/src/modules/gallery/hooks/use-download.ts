import ImageS3Client from "@/lib/s3/image-s3-client";
import { validS3SettingsAtom } from "@/stores/atoms/settings";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

export function useDownloadPhoto() {
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
        const res = await new ImageS3Client(s3Options).get(key);
        if (!res.Body) {
          toast.error(t("noBody"));
          return { success: false, error: "noBody" };
        }

        // @ts-expect-error - ArrayBuffer vs ArrayBufferLike error
        const blob = new Blob([await res.Body.transformToByteArray()]);

        const url = URL.createObjectURL(blob);
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
    [s3Options, t, tControl],
  );

  return handleDownload;
}
