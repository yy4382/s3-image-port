"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { selectAtom } from "jotai/utils";
import { ClientOnly } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { settings } from "@/stores/atoms/settings";
import { InvalidS3Dialog } from "@/modules/settings/InvalidS3Dialog";

import { uploadQueue } from "./upload-queue";
import { useHandlePaste } from "./hooks/use-handle-paste";
import { DropZone } from "./components/DropZone";
import { FilePreview } from "./components/FilePreview";

const storageConfiguredAtom = selectAtom(
  settings.storage,
  ({ validation }) => validation.status === "valid",
);
const queueViewAtom = selectAtom(
  uploadQueue,
  ({ uploads, hasUploaded }) => ({ uploads, hasUploaded }),
  (left, right) =>
    left.uploads === right.uploads && left.hasUploaded === right.hasUploaded,
);

export function Upload() {
  return <UploadContent />;
}

export function UploadContent() {
  const { uploads: uploadActors, hasUploaded } = useAtomValue(queueViewAtom);
  const send = useSetAtom(uploadQueue);
  const storageConfigured = useAtomValue(storageConfiguredAtom);
  const t = useTranslations("upload");

  useHandlePaste();

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card className="mb-8">
        <CardContent className="">
          <DropZone />
        </CardContent>
      </Card>

      <ClientOnly>{!storageConfigured && <InvalidS3Dialog />}</ClientOnly>

      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {t("fileList.title")} ({uploadActors.length})
        </h2>
        <div className="flex items-center space-x-2">
          {hasUploaded && (
            <Button
              variant="outline"
              onClick={() => send({ type: "uploaded.cleared" })}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {t("fileList.clearUploaded")}
            </Button>
          )}
          {uploadActors.length > 0 && (
            <Button
              onClick={() => {
                if (!storageConfigured) {
                  toast.error(t("alerts.s3NotConfigured"));
                  return;
                }
                send({
                  type: "all.uploadRequested",
                });
              }}
              size="lg"
              disabled={!storageConfigured}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t("fileList.uploadAll")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        {uploadActors.map((uploadActor) => (
          <FilePreview
            uploadActor={uploadActor}
            key={uploadActor.id}
            remove={() =>
              send({
                type: "upload.removed",
                actorRef: uploadActor,
              })
            }
          />
        ))}
      </div>
    </div>
  );
}
