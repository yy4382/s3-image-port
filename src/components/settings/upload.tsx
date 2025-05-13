import ImageCompressOptions from "@/components/settings/ImageCompressOptions";
import { KeyTemplate } from "@/components/settings/KeyTemplate";
import { useAtom } from "jotai";
import { uploadSettingsAtom } from "./settingsStore";
import { focusAtom } from "jotai-optics";

function UploadSettings() {
  return (
    <div>
      <div className="grid gap-6">
        <h2 className="text-2xl font-bold">Upload</h2>
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
