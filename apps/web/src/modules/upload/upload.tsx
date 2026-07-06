"use client";

import { useAtomValue } from "jotai";
import { ClientOnly } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { validS3SettingsAtom } from "@/stores/atoms/settings";
import { InvalidS3Dialog } from "@/modules/settings/InvalidS3Dialog";

import {
  selectHasUploaded,
  selectUploadActors,
  type UploadQueueEffects,
} from "./machines/upload-queue-machine";
import {
  UploadQueueProvider,
  useUploadQueueActor,
  useUploadQueueSelector,
} from "./upload-queue-context";
import { useHandlePaste } from "./hooks/use-handle-paste";
import { DropZone } from "./components/DropZone";
import { FilePreview } from "./components/FilePreview";

export function Upload({
  effects,
}: {
  effects?: Partial<UploadQueueEffects>;
} = {}) {
  return (
    <UploadQueueProvider effects={effects}>
      <UploadContent />
    </UploadQueueProvider>
  );
}

export function UploadContent() {
  const uploadActors = useUploadQueueSelector(selectUploadActors);
  const hasUploaded = useUploadQueueSelector(selectHasUploaded);
  const uploadQueue = useUploadQueueActor();
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
          {t("fileList.title")} ({uploadActors.length})
        </h2>
        <div className="flex items-center space-x-2">
          {hasUploaded && (
            <Button
              variant="outline"
              onClick={() => uploadQueue.send({ type: "uploaded.cleared" })}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {t("fileList.clearUploaded")}
            </Button>
          )}
          {uploadActors.length > 0 && (
            <Button
              onClick={() => {
                if (!s3Settings) {
                  toast.error(t("alerts.s3NotConfigured"));
                  return;
                }
                uploadQueue.send({
                  type: "all.uploadRequested",
                  s3Settings,
                });
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
        {uploadActors.map((uploadActor) => (
          <FilePreview
            uploadActor={uploadActor}
            key={uploadActor.id}
            remove={() =>
              uploadQueue.send({
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
