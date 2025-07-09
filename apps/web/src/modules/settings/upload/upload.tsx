"use client";

import ImageCompressOptions from "@/modules/settings/upload/ImageCompressOptions";
import { KeyTemplate } from "@/modules/settings/upload/KeyTemplate";
import { useAtom } from "jotai";
import { uploadSettingsAtom } from "../settings-store";
import { focusAtom } from "jotai-optics";
import { useTranslations } from "next-intl";

function UploadSettings() {
  const t = useTranslations("settings");

  return (
    <div>
      <div className="grid gap-6">
        <h2 className="text-2xl font-bold">{t("upload")}</h2>
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
