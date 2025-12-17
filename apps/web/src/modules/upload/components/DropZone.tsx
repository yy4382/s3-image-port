import { useSetAtom } from "jotai";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "use-intl";
import McUpload from "~icons/mingcute/file-upload-line";

import { appendFilesAtom } from "../atoms/upload-atoms";

export function DropZone() {
  const appendFiles = useSetAtom(appendFilesAtom);
  const t = useTranslations("upload.dropzone");
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      appendFiles(acceptedFiles);
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
