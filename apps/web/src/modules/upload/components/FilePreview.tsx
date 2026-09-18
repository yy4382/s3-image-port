import { startTransition, useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { selectAtom } from "jotai/utils";
import { useSelector } from "@xstate/react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations, useLocale } from "use-intl";
import { RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  isStoredUpload,
  type PendingUploadResult,
  type StoredUploadResult,
} from "../types";
import { storageFailureDetailsSchema } from "@/modules/image-storage/failure-details";
import McCheck from "~icons/mingcute/check-line";
import McTrash from "~icons/mingcute/delete-2-line";
import McPencil from "~icons/mingcute/edit-2-line";
import McUpload2 from "~icons/mingcute/upload-2-line";
import McLoading from "~icons/mingcute/loading-3-line";
import McCopy from "~icons/mingcute/copy-2-line";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AutoResizeHeight } from "@/components/misc/auto-resize-height";
import { settings } from "@/stores/atoms/settings";
import { useCopy } from "@/lib/hooks/use-copy";
import ImageCompressOptions from "@/modules/settings/upload/ImageCompressOptions";
import { KeyTemplateConsumerInput } from "@/modules/settings/upload/key-template/consumer-input";

import {
  selectPendingUpload,
  type PendingUploadActorRef,
} from "../machines/pending-upload-machine";
import type { CompressOption } from "@/lib/utils/imageCompress";

const storageConfiguredAtom = selectAtom(
  settings.storage,
  ({ validation }) => validation.status === "valid",
);
const keyTemplatePresetsAtom = selectAtom(
  settings.upload,
  ({ keyTemplatePresets }) => keyTemplatePresets,
);

export function FilePreview({
  uploadActor,
  remove,
}: {
  uploadActor: PendingUploadActorRef;
  remove: () => void;
}) {
  const file = useSelector(uploadActor, selectPendingUpload);
  const storageConfigured = useAtomValue(storageConfiguredAtom);
  const t = useTranslations("upload.fileList");

  const retryable =
    file.status === "failed" ||
    file.status === "processing-failed" ||
    file.status === "unconfirmed";
  const editingDisabled =
    file.status === "processing" || file.status === "uploading";

  return (
    <Card className="overflow-hidden px-3 py-2.5 gap-0">
      <div className="flex items-start sm:items-center flex-col sm:flex-row gap-2">
        <div className="grow min-w-0 flex items-center gap-2 w-full">
          <FilePreviewThumbnail file={file.file} />

          <div className="font-medium truncate text-sm" title={file.file.name}>
            {file.file.name}
          </div>
          <FilePreviewProcess
            file={file}
            process={() => uploadActor.send({ type: "process.requested" })}
          />
        </div>

        <div className="flex items-center space-x-1 self-end-safe sm:self-center">
          {isStoredUpload(file.lastResult) && (
            <CopyButton result={file.lastResult} />
          )}
          {file.status === "uploading" ? (
            <Button
              variant="outline"
              size="icon"
              disabled
              aria-label={t("uploading")}
            >
              <McLoading className="animate-spin" />
            </Button>
          ) : file.status === "uploaded" ? (
            <Button
              variant="outline"
              size="icon"
              disabled
              aria-label={t("uploaded")}
            >
              <McCheck className="text-green-500" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size={retryable ? "sm" : "icon"}
              onClick={() =>
                uploadActor.send({
                  type: retryable ? "retry.requested" : "upload.requested",
                })
              }
              disabled={
                editingDisabled ||
                (!storageConfigured && file.status !== "processing-failed")
              }
            >
              {retryable ? (
                t("retry")
              ) : (
                <>
                  <span className="sr-only">{t("upload")}</span>
                  <McUpload2 />
                </>
              )}
            </Button>
          )}

          <Button
            variant={file.editing ? "secondary" : "ghost"}
            size="icon"
            onClick={() => {
              uploadActor.send({ type: "edit.toggled" });
            }}
            disabled={editingDisabled}
          >
            <span className="sr-only">{t("edit")}</span>
            <McPencil />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={remove}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <span className="sr-only">{t("remove")}</span>
            <McTrash className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {file.lastResult && <UploadResult result={file.lastResult} />}
      <AutoResizeHeight duration={0.1}>
        <AnimatePresence initial={false} mode="popLayout">
          {file.editing && !editingDisabled && (
            <motion.div
              className="pt-4"
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{
                opacity: 0,
                filter: "blur(4px)",
                transition: { duration: 0.15 },
              }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <FilePreviewEdit
                file={file}
                updateProcessOption={(option) =>
                  uploadActor.send({ type: "compression.updated", option })
                }
                updateTemplate={(template) =>
                  uploadActor.send({ type: "template.updated", template })
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </AutoResizeHeight>
    </Card>
  );
}

function FilePreviewEdit({
  file,
  updateProcessOption,
  updateTemplate,
}: {
  file: ReturnType<typeof selectPendingUpload>;
  updateProcessOption: (option: CompressOption | null) => void;
  updateTemplate: (template: string) => void;
}) {
  const t = useTranslations("upload.fileList");
  const presets = useAtomValue(keyTemplatePresetsAtom) || [];
  return (
    <div className="space-y-4 pb-2">
      <div>
        <KeyTemplateConsumerInput
          value={file.key.template}
          onChange={updateTemplate}
          presets={presets}
        />
        <p className="text-sm text-muted-foreground mt-2">
          {t("keyWillBe")} {file.key.toString()}
        </p>
      </div>
      <Separator />
      {file.supportProcess && file.status !== "uploaded" && (
        <ImageCompressOptions
          value={file.compressOption}
          onChange={updateProcessOption}
        ></ImageCompressOptions>
      )}
    </div>
  );
}

function FilePreviewThumbnail({ file }: { file: File }) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;

    if (file.type.startsWith("image/")) {
      url = URL.createObjectURL(file);
      startTransition(() => {
        setFileUrl(url);
      });
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file]);

  return (
    <div className="h-8 w-8 mr-2 bg-secondary rounded shrink-0 overflow-hidden">
      {fileUrl ? (
        <img
          src={fileUrl}
          alt={file.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center h-full w-full">
          <span className="text-xs text-muted-foreground">File</span>
        </div>
      )}
    </div>
  );
}

function FilePreviewProcess({
  file,
  process,
}: {
  file: ReturnType<typeof selectPendingUpload>;
  process: () => void;
}) {
  const t = useTranslations("upload.fileList");
  const shownBadge = useMemo(() => {
    if (file.status === "processing") {
      return <>{t("compressing")}</>;
    }
    if (file.processedFile) {
      return (
        <>
          {t("compressed")} {(file.processedFile.size / 1024).toFixed(1)} KB
        </>
      );
    }
    return <>{(file.file.size / 1024).toFixed(1)} KB</>;
  }, [file.file.size, file.processedFile, file.status, t]);

  return (
    <div className="flex gap-1">
      <Badge
        variant="outline"
        className="text-xs whitespace-nowrap h-6 rounded-md"
      >
        {shownBadge}
      </Badge>
      {file.supportProcess &&
        file.compressOption !== null &&
        (file.status === "pending" || file.status === "processed") && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Badge
                  className="size-6 px-0 py-0 rounded-md"
                  render={
                    <button
                      onClick={process}
                      aria-label={
                        file.status === "pending"
                          ? t("process")
                          : t("recompress")
                      }
                    >
                      <RefreshCw className="size-5" />
                    </button>
                  }
                />
              }
            />
            <TooltipContent>
              {file.status === "pending" ? t("process") : t("recompress")}
            </TooltipContent>
          </Tooltip>
        )}
    </div>
  );
}

function UploadResult({ result }: { result: PendingUploadResult }) {
  const t = useTranslations("upload.fileList");
  const locale = useLocale();
  const stored = isStoredUpload(result);
  const error = "error" in result ? result.error : undefined;
  const details = storageFailureDetailsSchema.safeParse(
    error && "details" in error ? error.details : {},
  );
  const code = details.data?.code;
  const status = {
    "processing-failed": "processingFailed",
    unconfirmed: "unconfirmed",
    "stored-previous-target": "uploadedPrevious",
    stored: "uploaded",
    "stored-unreconciled": "uploaded",
    failed: "uploadFailed",
  } as const;
  const reason = uploadFailureReason(result, code);
  const showSettings =
    !stored &&
    result.status !== "processing-failed" &&
    result.status !== "unconfirmed";
  return (
    <div className="mt-2 space-y-1 text-sm min-w-0 break-words">
      <div role="status">
        <p className="font-medium">{t(status[result.status])}</p>
        {!stored && (
          <p className="text-muted-foreground">{t(`reasons.${reason}`)}</p>
        )}
      </div>
      {result.status !== "processing-failed" && (
        <details>
          <summary className="cursor-pointer w-fit underline underline-offset-4 py-1">
            {t("details")}
          </summary>
          <div className="text-muted-foreground space-y-1 py-1 [overflow-wrap:anywhere]">
            {result.status === "unconfirmed" && (
              <p>{t("unconfirmedDetails")}</p>
            )}
            {result.status === "stored-unreconciled" && (
              <p>{t("catalogPending")}</p>
            )}
            {stored ? (
              <>
                <p>
                  {t("destination")}: {safeEndpoint(result.receipt.endpoint)} ·{" "}
                  {result.receipt.bucket} · {result.receipt.region}
                </p>
                <p>key: {result.image.key}</p>
              </>
            ) : (
              <>
                {code && (
                  <p>
                    {t("errorCode")}: {code}
                  </p>
                )}
                {details.data?.httpStatus && (
                  <p>HTTP {details.data.httpStatus}</p>
                )}
                {!code && !details.data?.httpStatus && (
                  <p>{t("noErrorDetails")}</p>
                )}
              </>
            )}
          </div>
        </details>
      )}
      {showSettings && (
        <Link
          to="/$locale/settings/s3"
          params={{ locale }}
          className="inline-block underline underline-offset-4 py-1"
        >
          {t("s3Settings")}
        </Link>
      )}
    </div>
  );
}

function uploadFailureReason(
  result: PendingUploadResult,
  code: string | undefined,
) {
  if (result.status === "processing-failed") return "processing";
  if (result.status === "unconfirmed") return "unconfirmed";
  if ("error" in result) {
    if (result.error.reason === "not-configured") return "notConfigured";
    if (result.error.reason === "target-mismatch") return "targetMismatch";
    if (code === "NoSuchBucket") return "noSuchBucket";
    if (
      code &&
      [
        "InvalidAccessKeyId",
        "SignatureDoesNotMatch",
        "ExpiredToken",
        "InvalidToken",
      ].includes(code)
    )
      return "credentials";
    if (result.error.reason === "access-denied") return "accessDenied";
  }
  return "rejected";
}

function safeEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return url.origin + url.pathname;
  } catch {
    return "";
  }
}

function CopyButton({ result }: { result: StoredUploadResult }) {
  const t = useTranslations("upload.fileList");
  const { copy } = useCopy();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" aria-label={t("copy")} size="icon">
            <McCopy />
          </Button>
        }
      />
      <DropdownMenuContent className="w-40" align="end">
        <DropdownMenuItem
          onClick={() => copy(result.receipt.url, t("copyUrl"))}
        >
          {t("copyUrl")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            copy(
              `![${result.image.key}](${result.receipt.url})`,
              t("copyMarkdown"),
            )
          }
        >
          {t("copyMarkdown")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
