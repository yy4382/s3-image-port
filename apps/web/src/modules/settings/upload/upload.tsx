"use client";

import ImageCompressOptions from "@/modules/settings/upload/ImageCompressOptions";
import { KeyTemplateIndependent } from "@/modules/settings/upload/KeyTemplate";
import { useAtom } from "jotai";
import { uploadSettingsAtom } from "../settings-store";
import { focusAtom } from "jotai-optics";
import { useTranslations, useLocale } from "use-intl";
import { ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";

function UploadSettings() {
  const t = useTranslations("settings");
  const locale = useLocale();

  return (
    <div>
      <div className="grid gap-6">
        <div className="flex items-center gap-2 justify-between">
          <h2 className="text-2xl font-bold">{t("upload")}</h2>
          <Link
            from="/$locale"
            to="/$locale/docs/$"
            params={({ locale }) => ({ locale, _splat: "settings-reference" })}
            hash="upload-settings"
            target="_blank"
            className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            title="View documentation"
          >
            <span className="underline underline-offset-1">docs</span>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
        <KeyTemplateWrapper />
        <CompressOptionWrapper />
      </div>
    </div>
  );
}

const keyTemplateAtom = focusAtom(uploadSettingsAtom, (optic) =>
  optic.prop("keyTemplate"),
);

function KeyTemplateWrapper() {
  const [keyTemplate, setKeyTemplate] = useAtom(keyTemplateAtom);
  return (
    <KeyTemplateIndependent value={keyTemplate} onChange={setKeyTemplate} />
  );
}

const CompressOptionAtom = focusAtom(uploadSettingsAtom, (optic) =>
  optic.prop("compressionOption"),
);

function CompressOptionWrapper() {
  const [compressOption, setCompressOption] = useAtom(CompressOptionAtom);
  return (
    <ImageCompressOptions value={compressOption} onChange={setCompressOption} />
  );
}

export { UploadSettings };
