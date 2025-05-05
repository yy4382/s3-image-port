import ImageCompressOptions from "@/components/settings/ImageCompressOptions";
import {
  KeyTemplate,
  keyTemplateSchema,
} from "@/components/settings/KeyTemplate";
import { defaultKeyTemplate } from "@/utils/generateKey";
import {
  compressOptionSchema,
  type CompressOption,
} from "@/utils/imageCompress";
import { atom, useAtom, useAtomValue } from "jotai";
import {
  atomWithStorage,
  createJSONStorage,
  unstable_withStorageValidator as withStorageValidator,
} from "jotai/utils";
import * as z from "zod";

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

const keyTemplateAtom = atomWithStorage(
  "s3ip:upload-settings:key-template",
  defaultKeyTemplate,
  withStorageValidator((value): value is string => {
    return keyTemplateSchema.safeParse(value).success;
  })(createJSONStorage()),
);

function KeyTemplateWrapper() {
  const [keyTemplate, setKeyTemplate] = useAtom(keyTemplateAtom);
  return <KeyTemplate v={keyTemplate} set={setKeyTemplate} />;
}

const CompressOptionAtom = atomWithStorage<CompressOption | null>(
  "s3ip:upload-settings:compress",
  null,
);

function CompressOptionWrapper() {
  const [compressOption, setCompressOption] = useAtom(CompressOptionAtom);
  return (
    <ImageCompressOptions value={compressOption} onChange={setCompressOption} />
  );
}

export const uploadSettingsSchema = z.object({
  keyTemplate: keyTemplateSchema,
  compressionOption: compressOptionSchema.nullable(),
});

type UploadOptions = z.infer<typeof uploadSettingsSchema>;

export const uploadSettingsAtom = atom((get) => ({
  keyTemplate: get(keyTemplateAtom),
  compressionOption: get(CompressOptionAtom),
}));

export const setUploadSettingsAtom = atom(
  null,
  (_, set, uploadSettings: UploadOptions) => {
    set(keyTemplateAtom, uploadSettings.keyTemplate);
    set(CompressOptionAtom, uploadSettings.compressionOption);
  },
);

export function useUploadSettings() {
  const uploadSettings = useAtomValue(uploadSettingsAtom);
  const uploadSettingsValidation =
    uploadSettingsSchema.safeParse(uploadSettings);
  if (!uploadSettingsValidation.success) {
    console.error(
      "Upload settings validation failed",
      uploadSettingsValidation.error,
    );
    return null;
  }
  return uploadSettingsValidation.data;
}

export { UploadSettings };
