"use client";

import { useTranslations } from "next-intl";
import { FormEntrySwitchAtom } from "@/components/ui/form-entry-validate";
import { gallerySettingsAtom } from "../settings-store";
import { focusAtom } from "jotai-optics";

export function GallerySettings() {
  const t = useTranslations("settings.gallery");
  return (
    <div>
      <div className="grid gap-6">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <FormEntrySwitchAtom
          title={t("autoRefresh")}
          description={t("autoRefreshDesc")}
          atom={focusAtom(gallerySettingsAtom, (optic) =>
            optic.prop("autoRefresh"),
          )}
        />
      </div>
    </div>
  );
}
