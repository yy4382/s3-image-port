import ImageCompressOptions from "@/components/settings/ImageCompressOptions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { defaultKeyTemplate, S3Key } from "@/utils/generateKey";
import {
  isSupportedFileType,
  processFile,
  type CompressOption,
} from "@/utils/imageCompress";
import ImageS3Client from "@/utils/ImageS3Client";
import { createFileRoute } from "@tanstack/react-router";
import { atom, useAtom, useSetAtom, type PrimitiveAtom } from "jotai";
import { splitAtom } from "jotai/utils";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import McTrash from "~icons/mingcute/delete-2-line";
import McPencil from "~icons/mingcute/edit-2-line";
import McUpload from "~icons/mingcute/file-upload-line";
import { useS3SettingsValue, type S3Settings } from "./settings/s3";
import { KeyTemplate } from "@/components/settings/KeyTemplate";

export const Route = createFileRoute("/upload")({
  component: Upload,
});

type UploadObject = {
  file: File;
  processedFile: File | null;
  key: S3Key;
  processOption: CompressOption | null;
  status: "pending" | "processing" | "processed" | "uploading" | "uploaded";
  id: string;
  supportProcess: boolean;
};

const fileListAtom = atom<UploadObject[]>([]);

const appendFileAtom = atom(null, (get, set, newFiles: File[]) => {
  const uploadObjects = newFiles.map(
    (file) =>
      ({
        file,
        processedFile: null,
        // TODO: use setting's template
        key: new S3Key(file, defaultKeyTemplate),
        // TODO: Add a default process option
        processOption: null,
        id: uuid(),
        status: "pending",
        supportProcess: isSupportedFileType(file),
      }) as UploadObject,
  );
  set(fileListAtom, [...get(fileListAtom), ...uploadObjects]);
});

const fileAtomAtoms = splitAtom(fileListAtom, (file) => file.id);

const process = async (
  file: UploadObject,
  setFile: (arg: (prev: UploadObject) => UploadObject) => void,
) => {
  if (!file.processOption || !isSupportedFileType(file.file)) {
    return file.file;
  }
  setFile((prev) => ({
    ...prev,
    status: "processing",
  }));
  let processed: File;
  try {
    processed = await processFile(file.file, file.processOption, () => {});
  } catch (error) {
    toast.error(`Processing failed for ${file.file.name}`);
    console.error("Processing failed", error);
    setFile((prev) => ({
      ...prev,
      status: "pending",
    }));
    throw error;
  }
  setFile((prev) => ({
    ...prev,
    key: prev.key.updateFile(processed),
    processedFile: processed,
    status: "processed",
  }));
  return processed;
};
const upload = async (
  file: UploadObject,
  setFile: (arg: (prev: UploadObject) => UploadObject) => void,
  s3Settings: S3Settings,
) => {
  const processedFile = file.processedFile ?? (await process(file, setFile));
  setFile((prev) => ({
    ...prev,
    status: "uploading",
  }));
  try {
    await new ImageS3Client(s3Settings).upload(
      processedFile,
      file.key.toString(),
    );
    setFile((prev) => ({
      ...prev,
      status: "uploaded",
    }));
  } catch (error) {
    console.error("Upload failed", error);
    setFile((prev) => ({
      ...prev,
      status: "pending",
    }));
  }
};

const uploadAll = atom(null, async (get, set, s3Settings: S3Settings) => {
  const files = get(fileListAtom);
  await Promise.all(
    files.map((file) => {
      return upload(
        file,
        (arg) => {
          set(fileListAtom, (prev) => {
            const singlePrev = prev.findIndex((f) => f.id === file.id);
            if (singlePrev < 0) return prev;
            const newFiles = prev.slice();
            newFiles[singlePrev] = arg(file);
            return newFiles;
          });
        },
        s3Settings,
      );
    }),
  );
});

function useFileAtomOperations(atom: PrimitiveAtom<UploadObject>) {
  const [file, setFile] = useAtom(atom);

  const _process = useCallback(async () => {
    return process(file, setFile);
  }, [file, setFile]);

  const _upload = useCallback(
    async (s3Settings: S3Settings) => {
      upload(file, setFile, s3Settings);
    },
    [file, setFile],
  );
  const updateProcessOption = useCallback(
    (option: CompressOption | null) => {
      setFile((prev) => ({
        ...prev,
        processOption: option,
      }));
    },
    [setFile],
  );
  const updateTemplate = useCallback(
    (template: string) => {
      setFile((prev) => ({
        ...prev,
        key: prev.key.updateTemplate(template),
      }));
    },
    [setFile],
  );
  return {
    file,
    process: _process,
    upload: _upload,
    updateProcessOption,
    updateTemplate,
  };
}

function Upload() {
  const [fileAtoms, dispatch] = useAtom(fileAtomAtoms);
  const triggerUpload = useSetAtom(uploadAll);
  const s3Settings = useS3SettingsValue();

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card className="mb-8">
        <CardContent className="">
          <DropZone />
        </CardContent>
      </Card>

      {fileAtoms.length > 0 && (
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Files to upload ({fileAtoms.length})
          </h2>
          <Button
            onClick={() => {
              if (!s3Settings) {
                toast.error("S3 settings are not configured");
                return;
              }
              triggerUpload(s3Settings);
            }}
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Upload All Files
          </Button>
        </div>
      )}

      <div className="grid gap-1">
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
          <p className="text-lg font-medium">
            Drag files here or click to browse
          </p>
        </div>
      </div>
    </div>
  );
}

function FilePreview({
  fileAtom,
  remove,
}: {
  fileAtom: PrimitiveAtom<UploadObject>;
  remove: () => void;
}) {
  const { file, process, upload, updateProcessOption, updateTemplate } =
    useFileAtomOperations(fileAtom);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const s3Settings = useS3SettingsValue();

  // Generate and properly manage thumbnail preview for images
  useEffect(() => {
    let url: string | null = null;

    if (file.file.type.startsWith("image/")) {
      url = URL.createObjectURL(file.file);
      setFileUrl(url);
    }

    // Cleanup function to revoke the object URL
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file.file]);

  useEffect(() => {
    if (file.status === "uploaded") {
      setTimeout(() => {
        remove();
      }, 500);
    }
  }, [file.status, remove]);

  return (
    <Card className="overflow-hidden py-1">
      <div className="flex items-center px-3 py-1">
        <div className="h-8 w-8 mr-2 bg-secondary rounded flex-shrink-0 overflow-hidden">
          {fileUrl ? (
            <img
              src={fileUrl}
              alt={file.file.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full w-full">
              <span className="text-xs text-muted-foreground">File</span>
            </div>
          )}
        </div>

        <div className="flex-grow min-w-0 flex items-center">
          <div className="font-medium truncate text-sm" title={file.file.name}>
            {file.file.name}
          </div>
          <Badge variant="outline" className="ml-2 text-xs whitespace-nowrap">
            {(file.file.size / 1024).toFixed(1)} KB
          </Badge>
          {file.supportProcess && file.processOption !== null && (
            <FilePreviewProcess file={file} process={process} />
          )}
        </div>

        <div className="flex items-center space-x-1 ml-2">
          {file.status === "uploading" ? (
            <Button variant="outline" size="sm" disabled>
              Uploading...
            </Button>
          ) : file.status === "uploaded" ? (
            <Button variant="outline" size="sm" disabled>
              Uploaded
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => upload(s3Settings!)} // TODO: Handle s3Settings
            >
              Upload
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <span className="sr-only">Edit</span>
                <McPencil className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="p-4">
              <div className="space-y-6">
                <KeyTemplate
                  v={file.key.template}
                  set={(k) => {
                    updateTemplate(k);
                  }}
                />
                {file.supportProcess && (
                  <ImageCompressOptions
                    value={file.processOption}
                    onChange={updateProcessOption}
                  ></ImageCompressOptions>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={remove}
            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <span className="sr-only">Remove</span>
            <McTrash className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FilePreviewProcess({
  file,
  process,
}: {
  file: UploadObject;
  process: () => Promise<File>;
}) {
  return (
    <>
      {file.processedFile && (
        <>
          <Badge variant="outline" className="ml-2 text-xs whitespace-nowrap">
            Processed {(file.processedFile.size / 1024).toFixed(1)} KB
          </Badge>
        </>
      )}

      {(file.status === "pending" || file.status === "processed") && (
        <Badge
          variant={"default"}
          className="ml-2 text-xs whitespace-nowrap"
          asChild
        >
          <button onClick={process}>
            {file.status === "pending" ? "Process" : "Reprocess"}
          </button>
        </Badge>
      )}
      {file.status === "processing" && (
        <Badge variant="default" className="ml-2 text-xs whitespace-nowrap">
          Processing...
        </Badge>
      )}
    </>
  );
}
