"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { selectAtom } from "jotai/utils";
import { ClientOnly } from "@tanstack/react-router";
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
const uploadActorsAtom = selectAtom(uploadQueue, ({ uploads }) => uploads);
const queueCountsAtom = selectAtom(
  uploadQueue,
  ({ counts }) => counts,
  (left, right) =>
    Object.keys(left).every(
      (key) =>
        left[key as keyof typeof left] === right[key as keyof typeof right],
    ),
);

export function Upload() {
  return <UploadContent />;
}

export function UploadContent() {
  const uploadActors = useAtomValue(uploadActorsAtom);
  const send = useSetAtom(uploadQueue);
  const storageConfigured = useAtomValue(storageConfiguredAtom);

  useHandlePaste();

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card className="mb-8">
        <CardContent className="">
          <DropZone />
        </CardContent>
      </Card>

      <ClientOnly>{!storageConfigured && <InvalidS3Dialog />}</ClientOnly>

      <UploadQueueControls total={uploadActors.length} />

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

function UploadQueueControls({ total }: { total: number }) {
  const counts = useAtomValue(queueCountsAtom);
  const send = useSetAtom(uploadQueue);
  const configured = useAtomValue(storageConfiguredAtom);
  const t = useTranslations("upload.fileList");
  return (
    <div className="mb-4 space-y-3">
      <h2 className="text-xl font-semibold">
        {t("title")} ({total})
      </h2>
      <p
        role="status"
        className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1"
      >
        {(
          [
            "uploaded",
            "failed",
            "unconfirmed",
            "processing",
            "uploading",
          ] as const
        ).map((status) =>
          counts[status] > 0 ? (
            <span key={status}>
              {t(`counts.${status}`, { count: counts[status] })}
            </span>
          ) : null,
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {counts.uploaded > 0 && (
          <Button
            variant="outline"
            onClick={() => send({ type: "uploaded.cleared" })}
          >
            {t("clearUploaded")}
          </Button>
        )}
        {counts.failed > 0 && (
          <Button
            variant="outline"
            disabled={!configured}
            onClick={() => send({ type: "failed.retryRequested" })}
          >
            {t("retryFailed", { count: counts.failed })}
          </Button>
        )}
        {counts.pending > 0 && (
          <Button
            disabled={!configured}
            onClick={() => send({ type: "all.uploadRequested" })}
          >
            {t("uploadAll", { count: counts.pending })}
          </Button>
        )}
      </div>
    </div>
  );
}
