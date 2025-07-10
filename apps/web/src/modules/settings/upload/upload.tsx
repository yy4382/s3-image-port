"use client";

import ImageCompressOptions from "@/modules/settings/upload/ImageCompressOptions";
import { KeyTemplate } from "@/modules/settings/upload/KeyTemplate";
import { useAtom } from "jotai";
import { uploadSettingsAtom } from "../settings-store";
import { focusAtom } from "jotai-optics";
import { useTranslations, useLocale } from "next-intl";
import { ExternalLink } from "lucide-react";

function UploadSettings() {
  const t = useTranslations("settings");
  const locale = useLocale();

  return (
    <div>
      <div className="grid gap-6">
        <div className="flex items-center gap-2 justify-between">
          <h2 className="text-2xl font-bold">{t("upload")}</h2>
          <a
            href={new URL(
              locale === "zh"
                ? "/zh/guide/settings-reference#upload-settings"
                : "/guide/settings-reference#upload-settings",
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
  return <KeyTemplate v={keyTemplate} set={setKeyTemplate} />;
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
