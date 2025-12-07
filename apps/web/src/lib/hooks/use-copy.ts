import { toast } from "sonner";
import { useTranslations } from "use-intl";

export function useCopy() {
  const t = useTranslations("common.copy");
  const copy = (text: string, textDescription?: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success(
          textDescription
            ? t("copied", { desc: textDescription })
            : t("copiedNoDesc"),
        );
      })
      .catch(() => {
        toast.error(
          textDescription
            ? t("copyFailed", { desc: textDescription })
            : t("copyFailedNoDesc"),
        );
      });
  };
  const copyAsync = async (text: string, textDescription?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(
        textDescription
          ? t("copied", { desc: textDescription })
          : t("copiedNoDesc"),
      );
    } catch {
      toast.error(
        textDescription
          ? t("copyFailed", { desc: textDescription })
          : t("copyFailedNoDesc"),
      );
    }
  };
  return { copy, copyAsync };
}
