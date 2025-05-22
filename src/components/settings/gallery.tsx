"use client";

import { useTranslations } from "next-intl";
import { SettingsInputEntry } from "./s3";
import { gallerySettingsAtom, gallerySettingsSchema } from "./settingsStore";
import { focusAtom } from "jotai-optics";
import { Switch } from "@/components/ui/switch";

export function GallerySettings() {
  const t = useTranslations("settings.gallery");
  return (
    <div>
      <div className="grid gap-6">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <SettingsInputEntry
          title={t("autoRefresh")}
          description={t("autoRefreshDesc")}
          atom={focusAtom(gallerySettingsAtom, (optic) =>
            optic.prop("autoRefresh"),
          )}
          schema={gallerySettingsSchema.shape.autoRefresh}
          input={(v, s, id) => (
            <Switch
              id={id}
              checked={v as boolean}
              onCheckedChange={(checked) => s(checked)}
            />
          )}
        />
      </div>
    </div>
  );
}
