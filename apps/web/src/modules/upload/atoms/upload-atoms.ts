import { atom, type PrimitiveAtom } from "jotai";
import { splitAtom } from "jotai/utils";
import { monotonicFactory } from "ulid";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";

import { defaultKeyTemplate, S3KeyMetadata } from "@/lib/s3/s3-key";
import { planLivePhotoUpload, splitKeyExt } from "@/lib/live-photo/live-photo";
import { isSupportedFileType, processFile } from "@/lib/utils/imageCompress";
import ImageS3Client from "@/lib/s3/image-s3-client";
import { uploadSettingsAtom } from "@/stores/atoms/settings";
import { setGalleryDirtyAtom } from "@/stores/atoms/gallery";
import type { S3Options } from "@/stores/schemas/settings";
import type { PendingUpload } from "../types";

export const fileListAtom = atom<PendingUpload[]>([]);

export const appendFilesAtom = atom(null, (get, set, newFiles: File[]) => {
  const uploadSettings = get(uploadSettingsAtom);
  const template = uploadSettings?.keyTemplate ?? defaultKeyTemplate;
  const ulid = monotonicFactory();
  const ids = newFiles.map(() => uuid());

  // Detect Live Photo pairs (still + .mov) within this batch so the motion
  // video can share its still's key base and pair again once listed.
  const roles = planLivePhotoUpload(newFiles);
  const motionIdByStillIndex = new Map<number, string>();
  roles.forEach((role, i) => {
    if (role.type === "motion") {
      motionIdByStillIndex.set(role.stillIndex, ids[i]);
    }
  });
  const keys = new Array<S3KeyMetadata>(newFiles.length);
  // First pass: stills and standalone files each get a fresh key.
  newFiles.forEach((file, i) => {
    if (roles[i].type === "motion") return;
    keys[i] = S3KeyMetadata.create(file, template, ulid);
  });
  // Second pass: motion videos reuse their still's key base, swapping the ext.
  newFiles.forEach((file, i) => {
    const role = roles[i];
    if (role.type !== "motion") return;
    keys[i] = livePhotoMotionKey(keys[role.stillIndex], file.name);
  });

  const uploadObjects = newFiles.map((file, i) => {
    const supportProcess = isSupportedFileType(file);
    return {
      file,
      processedFile: null,
      key: keys[i],
      compressOption: supportProcess
        ? (uploadSettings?.compressionOption ?? null)
        : null,
      id: ids[i],
      status: "pending",
      supportProcess,
      ...(roles[i].type === "still" && {
        livePhotoMotionUploadId: motionIdByStillIndex.get(i),
      }),
      ...(roles[i].type === "motion" && {
        livePhotoStillUploadId: ids[roles[i].stillIndex],
      }),
    } satisfies PendingUpload;
  });
  set(fileListAtom, [...get(fileListAtom), ...uploadObjects]);
});

/**
 * Key for a Live Photo's motion video: the still's key with the motion file's
 * own extension swapped in, falling back to the extension the motion key already
 * carries, then `mov`. This keeps the still and motion sharing a base so they
 * pair again once listed.
 */
function livePhotoMotionKey(
  stillKey: S3KeyMetadata,
  motionName: string,
  currentMotionKey?: string,
): S3KeyMetadata {
  const ext =
    splitKeyExt(motionName).ext ||
    (currentMotionKey ? splitKeyExt(currentMotionKey).ext : "") ||
    "mov";
  return S3KeyMetadata.withExt(stillKey, ext);
}

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
    if (
      !initFile.compressOption ||
      !isSupportedFileType(initFile.file) ||
      initFile.processedFile
    ) {
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
      let updatedStill: PendingUpload | undefined;
      set(atom, (prev) => {
        updatedStill = {
          ...prev,
          processedFile: processed,
          key: S3KeyMetadata.updateFile(processed, prev.key),
          status: "processed",
        };
        return updatedStill;
      });
      if (updatedStill?.livePhotoMotionUploadId) {
        const still = updatedStill;
        set(fileListAtom, (prev) =>
          prev.map((file) =>
            file.livePhotoStillUploadId === still.id
              ? {
                  ...file,
                  key: livePhotoMotionKey(
                    still.key,
                    file.file.name,
                    file.key.toString(),
                  ),
                }
              : file,
          ),
        );
      }
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
    let file = get(atom);
    if (file.livePhotoStillUploadId) {
      const stillAtom = get(fileAtomAtoms).find(
        (candidate) => get(candidate).id === file.livePhotoStillUploadId,
      );
      if (stillAtom) {
        await set(processFileAtom, stillAtom);
        const still = get(stillAtom);
        set(atom, (prev) => ({
          ...prev,
          key: livePhotoMotionKey(
            still.key,
            prev.file.name,
            prev.key.toString(),
          ),
        }));
      }
    }
    await set(processFileAtom, atom);
    file = get(atom);
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
