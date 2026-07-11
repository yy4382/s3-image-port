import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { selectAtom } from "jotai/utils";
import { useSelector } from "@xstate/react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "use-intl";
import { RefreshCw } from "lucide-react";
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
import { imageCatalog } from "@/modules/image-catalog";
import { useCopy } from "@/lib/hooks/use-copy";
import { toast } from "sonner";
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
          {file.status === "uploaded" && <CopyButton file={file} />}
          {file.status === "uploading" ? (
            <Button variant="outline" size="icon" disabled>
              <McLoading className="animate-spin" />
            </Button>
          ) : file.status === "uploaded" ? (
            <Button variant="outline" size="icon" disabled>
              <McCheck className="text-green-500" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                uploadActor.send({
                  type: "upload.requested",
                })
              }
              disabled={!storageConfigured}
            >
              <span className="sr-only">{t("upload")}</span>
              <McUpload2 />
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
      {file.supportProcess && (
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

function CopyButton({
  file,
}: {
  file: ReturnType<typeof selectPendingUpload>;
}) {
  const t = useTranslations("upload.fileList");
  const tCopy = useTranslations("common.copy");
  const runCatalog = useSetAtom(imageCatalog.run);
  const { copy } = useCopy();
  const key = file.key.toString();
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const copyStoredImage = async (
    purpose: "url" | "markdown",
    description: string,
  ) => {
    const outcome = await runCatalog({ type: "access", key, purpose });
    if (!mounted.current) return;
    if (
      outcome.status === "accessed" &&
      outcome.purpose === purpose &&
      typeof outcome.value === "string"
    ) {
      copy(outcome.value, description);
      return;
    }
    toast.error(tCopy("copyFailed", { desc: description }));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" aria-label="Open menu" size="icon">
            <span className="sr-only">{t("copy")}</span>
            <McCopy />
          </Button>
        }
      />
      <DropdownMenuContent className="w-40" align="end">
        <DropdownMenuItem onClick={() => copyStoredImage("url", t("copyUrl"))}>
          {t("copyUrl")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => copyStoredImage("markdown", t("copyMarkdown"))}
        >
          {t("copyMarkdown")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
