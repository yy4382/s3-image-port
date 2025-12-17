"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ClientOnly } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { validS3SettingsAtom } from "@/stores/atoms/settings";
import { InvalidS3Dialog } from "@/modules/settings/InvalidS3Dialog";

import {
  fileAtomAtoms,
  uploadAllFilesAtom,
  clearUploadedFilesAtom,
} from "./atoms/upload-atoms";
import { useHandlePaste } from "./hooks/use-handle-paste";
import { DropZone } from "./components/DropZone";
import { FilePreview } from "./components/FilePreview";

export function Upload() {
  const [fileAtoms, dispatch] = useAtom(fileAtomAtoms);
  const triggerUpload = useSetAtom(uploadAllFilesAtom);
  const [hasUploaded, removeUploaded] = useAtom(clearUploadedFilesAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const t = useTranslations("upload");

  useHandlePaste();

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card className="mb-8">
        <CardContent className="">
          <DropZone />
        </CardContent>
      </Card>

      <ClientOnly>{!s3Settings && <InvalidS3Dialog />}</ClientOnly>

      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {t("fileList.title")} ({fileAtoms.length})
        </h2>
        <div className="flex items-center space-x-2">
          {hasUploaded && (
            <Button
              variant="outline"
              onClick={removeUploaded}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {t("fileList.clearUploaded")}
            </Button>
          )}
          {fileAtoms.length > 0 && (
            <Button
              onClick={() => {
                if (!s3Settings) {
                  toast.error(t("alerts.s3NotConfigured"));
                  return;
                }
                triggerUpload(s3Settings);
              }}
              size="lg"
              disabled={!s3Settings}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t("fileList.uploadAll")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        {fileAtoms.map((fileAtom) => (
          <FilePreview
            fileAtom={fileAtom}
            key={`${fileAtom}`}
            remove={() => dispatch({ type: "remove", atom: fileAtom })}
          />
        ))}
      </div>
    </div>
  );
}
