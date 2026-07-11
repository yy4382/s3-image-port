import { useDropzone } from "react-dropzone";
import { useTranslations } from "use-intl";
import McUpload from "~icons/mingcute/file-upload-line";
import { useAtomValue, useSetAtom } from "jotai";
import { selectAtom } from "jotai/utils";

import { settings } from "@/stores/atoms/settings";
import { uploadQueue } from "../upload-queue";

const queueDefaultsAtom = selectAtom(
  settings.upload,
  ({ keyTemplate, compressionOption }) => ({
    keyTemplate,
    compressionOption,
  }),
  (left, right) =>
    left.keyTemplate === right.keyTemplate &&
    left.compressionOption === right.compressionOption,
);

export function DropZone() {
  const send = useSetAtom(uploadQueue);
  const uploadSettings = useAtomValue(queueDefaultsAtom);
  const t = useTranslations("upload.dropzone");
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      send({
        type: "files.added",
        files: acceptedFiles,
        keyTemplate: uploadSettings?.keyTemplate,
        compressOption: uploadSettings?.compressionOption,
      });
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
        ${isDragActive ? "border-primary bg-secondary/20" : "border-border hover:border-primary/50"}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="h-16 w-16 text-muted-foreground">
          <McUpload className="h-16 w-16" />
        </div>
        <div>
          <p className="text-lg font-medium">{t("title")}</p>
        </div>
      </div>
    </div>
  );
}
