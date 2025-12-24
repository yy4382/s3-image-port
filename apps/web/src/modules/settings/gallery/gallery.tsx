"use client";

import { useTranslations, useLocale } from "use-intl";
import { ExternalLink } from "lucide-react";
import { gallerySettingsAtom } from "@/stores/atoms/settings";
import { focusAtom } from "jotai-optics";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Switch } from "@/components/animate-ui/components/base/switch";
import { useAtom } from "jotai";
import { Link } from "@tanstack/react-router";

const autoRefreshAtom = focusAtom(gallerySettingsAtom, (optic) =>
  optic.prop("autoRefresh"),
);
export function GallerySettings() {
  const t = useTranslations("settings.gallery");
  const locale = useLocale();
  const [autoRefresh, setAutoRefresh] = useAtom(autoRefreshAtom);
  return (
    <div>
      <div className="grid gap-6">
        <div className="flex items-center gap-2 justify-between">
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <Link
            from="/$locale"
            to="/$locale/docs/$"
            params={{ locale, _splat: "settings-reference" }}
            hash="gallery-settings"
            target="_blank"
            className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            title="View documentation"
          >
            <span className="underline underline-offset-1">docs</span>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
        {/* <FormEntrySwitchAtom
          title={t("autoRefresh")}
          description={t("autoRefreshDesc")}
          atom={focusAtom(gallerySettingsAtom, (optic) =>
            optic.prop("autoRefresh"),
          )}
        /> */}
        <Field className="gap-1" orientation="horizontal">
          <FieldContent>
            <FieldLabel>{t("autoRefresh")}</FieldLabel>
            <FieldDescription>{t("autoRefreshDesc")}</FieldDescription>
          </FieldContent>
          <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
        </Field>
      </div>
    </div>
  );
}
