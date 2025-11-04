"use client";

import ImageCompressOptions from "@/modules/settings/upload/ImageCompressOptions";
import { KeyTemplateConsumerInput } from "../settings/upload/key-template/consumer-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { defaultKeyTemplate, S3Key } from "@/lib/utils/generateKey";
import {
  isSupportedFileType,
  processFile,
  type CompressOption,
} from "@/lib/utils/imageCompress";
import ImageS3Client from "@/lib/utils/ImageS3Client";
import { ClientOnly } from "@tanstack/react-router";
import {
  atom,
  useAtom,
  useAtomValue,
  useSetAtom,
  type PrimitiveAtom,
} from "jotai";
import { splitAtom } from "jotai/utils";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { monotonicFactory } from "ulid";
import { v4 as uuid } from "uuid";
import McCheck from "~icons/mingcute/check-line";
import McTrash from "~icons/mingcute/delete-2-line";
import McPencil from "~icons/mingcute/edit-2-line";
import McUpload from "~icons/mingcute/file-upload-line";
import McLoading from "~icons/mingcute/loading-3-line";
import McUpload2 from "~icons/mingcute/upload-2-line";
import McCopy from "~icons/mingcute/copy-2-line";
import {
  validS3SettingsAtom,
  type S3Options,
  uploadSettingsAtom,
} from "../settings/settings-store";
import key2Url from "@/lib/utils/key2Url";
import { useTranslations } from "use-intl";
import { InvalidS3Dialog } from "@/modules/settings/InvalidS3Dialog";
import { setGalleryDirtyAtom } from "../gallery/galleryStore";
import { AutoResizeHeight } from "@/components/misc/auto-resize-height";
import { AnimatePresence, motion } from "motion/react";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@radix-ui/react-tooltip";
import { RefreshCw } from "lucide-react";

type UploadObject = {
  file: File;
  processedFile: File | null;
  key: S3Key;
  compressOption: CompressOption | null;
  status: "pending" | "processing" | "processed" | "uploading" | "uploaded";
  id: string;
  supportProcess: boolean;
};

const fileListAtom = atom<UploadObject[]>([]);

const appendFileAtom = atom(null, (get, set, newFiles: File[]) => {
  const uploadSettings = get(uploadSettingsAtom);
  const ulid = monotonicFactory();
  const uploadObjects = newFiles.map(
    (file) =>
      ({
        file,
        processedFile: null,
        key: S3Key.create(
          file,
          uploadSettings?.keyTemplate ?? defaultKeyTemplate,
          ulid,
        ),
        compressOption: uploadSettings?.compressionOption ?? null,
        id: uuid(),
        status: "pending",
        supportProcess: isSupportedFileType(file),
      }) satisfies UploadObject,
  );
  set(fileListAtom, [...get(fileListAtom), ...uploadObjects]);
});

const removeUploadedFileAtom = atom(
  (get) => {
    return get(fileListAtom).some((file) => file.status === "uploaded");
  },
  (get, set) => {
    const filtered = get(fileListAtom).filter(
      (file) => file.status !== "uploaded",
    );
    set(fileListAtom, filtered);
  },
);

const fileAtomAtoms = splitAtom(fileListAtom, (file) => file.id);

const processAtom = atom(
  null,
  async (get, set, atom: PrimitiveAtom<UploadObject>) => {
    const initFile = get(atom);
    if (!initFile.compressOption || !isSupportedFileType(initFile.file)) {
      return;
    }
    set(atom, (prev) => ({
      ...prev,
      status: "processing",
    }));
    try {
      const file = get(atom);
      const processed = await processFile(
        file.file,
        file.compressOption!,
        () => {},
      );
      set(atom, (prev) => ({
        ...prev,
        processedFile: processed,
        key: S3Key.updateFile(processed, prev.key),
        status: "processed",
      }));
    } catch (error) {
      toast.error(`Processing failed for ${get(atom).file.name}`);
      console.error("Processing failed", error);
      set(atom, (prev) => ({
        ...prev,
        status: "pending",
      }));
      throw error;
    }
  },
);

const uploadAtom = atom(
  null,
  async (
    get,
    set,
    atom: PrimitiveAtom<UploadObject>,
    s3Settings: S3Options,
  ) => {
    await set(processAtom, atom);
    const file = get(atom);
    const processedFile = file.processedFile ?? file.file;
    set(atom, (prev) => ({
      ...prev,
      status: "uploading",
    }));
    try {
      await new ImageS3Client(s3Settings).upload(
        processedFile,
        file.key.toString(),
      );
      set(atom, (prev) => ({
        ...prev,
        status: "uploaded",
      }));
      set(setGalleryDirtyAtom);
    } catch (error) {
      console.error("Upload failed", error);
      set(atom, (prev) => ({
        ...prev,
        status: "pending",
      }));
    }
  },
);

const uploadAll = atom(null, async (get, set, s3Settings: S3Options) => {
  await Promise.all(
    get(fileAtomAtoms).map(async (atom) => {
      await set(uploadAtom, atom, s3Settings);
    }),
  );
});

/**
 * A enhanced hook like `useAtom(UploadObjectAtom)` but replace the `set` with custom callback
 * @param atom - The file atom
 * @returns The file and update functions
 */
function useFileAtomOperations(atom: PrimitiveAtom<UploadObject>) {
  const [file, setFile] = useAtom(atom);

  const updateProcessOption = useCallback(
    (option: CompressOption | null) => {
      setFile((prev) => ({
        ...prev,
        status: "pending",
        processedFile: null,
        compressOption: option,
      }));
    },
    [setFile],
  );
  const updateTemplate = useCallback(
    (template: string) => {
      setFile((prev) => ({
        ...prev,
        key: S3Key.updateTemplate(template, prev.key),
      }));
    },
    [setFile],
  );
  return {
    file,
    updateProcessOption,
    updateTemplate,
  };
}

/**
 * Handle paste event to append files to the file list
 */
function useHandlePaste() {
  const appendFiles = useSetAtom(appendFileAtom);

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      if (!event.clipboardData) return;
      const items = event.clipboardData.items;
      if (!items) return;
      const files = Array.from(items)
        .filter(
          (item) => item.kind === "file" && item.type.startsWith("image/"),
        )
        .map((item) => item.getAsFile())
        .filter((file) => file !== null);
      appendFiles(files);
    },
    [appendFiles],
  );

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);
}

export function Upload() {
  const [fileAtoms, dispatch] = useAtom(fileAtomAtoms);
  const triggerUpload = useSetAtom(uploadAll);
  const [hasUploaded, removeUploaded] = useAtom(removeUploadedFileAtom);
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

function DropZone() {
  const appendFiles = useSetAtom(appendFileAtom);
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

const presetsAtom = atom(
  (get) => get(uploadSettingsAtom).keyTemplatePresets || [],
);

function FilePreview({
  fileAtom,
  remove,
}: {
  fileAtom: PrimitiveAtom<UploadObject>;
  remove: () => void;
}) {
  const upload = useSetAtom(uploadAtom);
  const process = useSetAtom(processAtom);
  const file = useAtomValue(fileAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const t = useTranslations("upload.fileList");

  const [isEditing, setIsEditing] = useState(false);

  return (
    <Card className="overflow-hidden px-3 py-2.5 gap-0">
      <div className="flex items-start sm:items-center flex-col sm:flex-row gap-2">
        <div className="grow min-w-0 flex items-center gap-2 w-full">
          <FilePreviewThumbnail file={file.file} />

          <div className="font-medium truncate text-sm" title={file.file.name}>
            {file.file.name}
          </div>
          <FilePreviewProcess file={file} process={() => process(fileAtom)} />
        </div>

        <div className="flex items-center space-x-1 self-end-safe sm:self-center">
          {file.status === "uploaded" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                try {
                  navigator.clipboard.writeText(
                    key2Url(file.key.toString(), s3Settings!),
                  );
                  toast.success(t("urlCopied"));
                } catch {
                  toast.error(t("copyFailed"));
                }
              }}
            >
              <span className="sr-only">{t("copy")}</span>
              <McCopy />
            </Button>
          )}
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
              onClick={() => upload(fileAtom, s3Settings!)}
              disabled={!s3Settings}
            >
              <span className="sr-only">{t("upload")}</span>
              <McUpload2 />
            </Button>
          )}

          <Button
            variant={isEditing ? "secondary" : "ghost"}
            size="icon"
            onClick={() => {
              setIsEditing((prev) => !prev);
            }}
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
          {isEditing && (
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
              <FilePreviewEdit fileAtom={fileAtom} />
            </motion.div>
          )}
        </AnimatePresence>
      </AutoResizeHeight>
    </Card>
  );
}

function FilePreviewEdit({
  fileAtom,
}: {
  fileAtom: PrimitiveAtom<UploadObject>;
}) {
  const { file, updateProcessOption, updateTemplate } =
    useFileAtomOperations(fileAtom);
  const t = useTranslations("upload.fileList");
  const presets = useAtomValue(presetsAtom);
  return (
    <div className="space-y-6">
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

  // Generate and properly manage thumbnail preview for images
  useEffect(() => {
    let url: string | null = null;

    if (file.type.startsWith("image/")) {
      url = URL.createObjectURL(file);
      startTransition(() => {
        setFileUrl(url);
      });
    }

    // Cleanup function to revoke the object URL
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
  file: UploadObject;
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
      <Badge variant="outline" className="text-xs whitespace-nowrap h-6">
        {shownBadge}
      </Badge>
      {file.supportProcess &&
        file.compressOption !== null &&
        (file.status === "pending" || file.status === "processed") && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="size-6 px-0 py-0" asChild>
                <button
                  onClick={process}
                  aria-label={
                    file.status === "pending" ? t("process") : t("recompress")
                  }
                >
                  <RefreshCw className="size-5" />
                </button>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {file.status === "pending" ? t("process") : t("recompress")}
            </TooltipContent>
          </Tooltip>
        )}
    </div>
  );
}
