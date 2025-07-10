"use client";

import { useTranslations, useLocale } from "next-intl";
import { ExternalLink } from "lucide-react";
import { FormEntrySwitchAtom } from "@/components/ui/form-entry-validate";
import { gallerySettingsAtom } from "../settings-store";
import { focusAtom } from "jotai-optics";

export function GallerySettings() {
  const t = useTranslations("settings.gallery");
  const locale = useLocale();
  return (
    <div>
      <div className="grid gap-6">
        <div className="flex items-center gap-2 justify-between">
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <a
            href={new URL(
              locale === "zh"
                ? "/zh/guide/settings-reference#gallery-settings"
                : "/guide/settings-reference#gallery-settings",
              process.env.NEXT_PUBLIC_DOCS_ORIGIN ??
                "https://docs.imageport.app",
            ).toString()}
            target="_blank"
            className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            title="View documentation"
          >
            <span className="underline underline-offset-1">docs</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
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
