import { atom, type PrimitiveAtom } from "jotai";
import { splitAtom } from "jotai/utils";
import { monotonicFactory } from "ulid";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";

import { defaultKeyTemplate, S3KeyMetadata } from "@/lib/s3/s3-key";
import { isSupportedFileType, processFile } from "@/lib/utils/imageCompress";
import ImageS3Client from "@/lib/s3/image-s3-client";
import { uploadSettingsAtom } from "@/stores/atoms/settings";
import { setGalleryDirtyAtom } from "@/stores/atoms/gallery";
import type { S3Options } from "@/stores/schemas/settings";
import type { PendingUpload } from "../types";

export const fileListAtom = atom<PendingUpload[]>([]);

export const appendFilesAtom = atom(null, (get, set, newFiles: File[]) => {
  const uploadSettings = get(uploadSettingsAtom);
  const ulid = monotonicFactory();
  const uploadObjects = newFiles.map(
    (file) =>
      ({
        file,
        processedFile: null,
        key: S3KeyMetadata.create(
          file,
          uploadSettings?.keyTemplate ?? defaultKeyTemplate,
          ulid,
        ),
        compressOption: uploadSettings?.compressionOption ?? null,
        id: uuid(),
        status: "pending",
        supportProcess: isSupportedFileType(file),
      }) satisfies PendingUpload,
  );
  set(fileListAtom, [...get(fileListAtom), ...uploadObjects]);
});

export const clearUploadedFilesAtom = atom(
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

export const fileAtomAtoms = splitAtom(fileListAtom, (file) => file.id);

export const processFileAtom = atom(
  null,
  async (get, set, atom: PrimitiveAtom<PendingUpload>) => {
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
        key: S3KeyMetadata.updateFile(processed, prev.key),
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

export const uploadFileAtom = atom(
  null,
  async (
    get,
    set,
    atom: PrimitiveAtom<PendingUpload>,
    s3Settings: S3Options,
  ) => {
    await set(processFileAtom, atom);
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

export const uploadAllFilesAtom = atom(
  null,
  async (get, set, s3Settings: S3Options) => {
    await Promise.all(
      get(fileAtomAtoms).map(async (atom) => {
        await set(uploadFileAtom, atom, s3Settings);
      }),
    );
  },
);

export const presetsAtom = atom(
  (get) => get(uploadSettingsAtom).keyTemplatePresets || [],
);
