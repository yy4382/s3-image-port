"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useActorRef, useSelector } from "@xstate/react";
import { toast } from "sonner";

import { createS3ImageStorage } from "@/modules/image-storage";
import { processFile } from "@/lib/utils/imageCompress";
import { setGalleryDirtyAtom } from "@/stores/atoms/gallery";
import { uploadSettingsAtom } from "@/stores/atoms/settings";

import {
  uploadQueueMachine,
  type UploadQueueActorRef,
  type UploadQueueEffects,
} from "./machines/upload-queue-machine";

const UploadQueueContext = createContext<UploadQueueActorRef | null>(null);

export type UploadQueueProviderProps = {
  children: ReactNode;
  effects?: Partial<UploadQueueEffects>;
};

export function UploadQueueProvider({
  children,
  effects,
}: UploadQueueProviderProps) {
  const markGalleryDirty = useSetAtom(setGalleryDirtyAtom);
  const actorRef = useActorRef(uploadQueueMachine, {
    input: {
      effects: {
        processFile,
        createStorage: createS3ImageStorage,
        onProcessingFailed(file, error) {
          toast.error(`Processing failed for ${file.name}`);
          console.error("Processing failed", error);
        },
        onUploadFailed(_file, error) {
          console.error("Upload failed", error);
        },
        onUploadSucceeded() {
          markGalleryDirty();
        },
        ...effects,
      },
    },
  });

  return <UploadQueueContext value={actorRef}>{children}</UploadQueueContext>;
}

export function useUploadQueueActor() {
  const actorRef = useContext(UploadQueueContext);
  if (!actorRef) {
    throw new Error(
      "useUploadQueueActor must be used within UploadQueueProvider",
    );
  }
  return actorRef;
}

export function useUploadQueueSelector<T>(
  selector: (snapshot: ReturnType<UploadQueueActorRef["getSnapshot"]>) => T,
  compare?: (a: T, b: T) => boolean,
) {
  return useSelector(useUploadQueueActor(), selector, compare);
}

export function useAddFilesToUploadQueue() {
  const actorRef = useUploadQueueActor();
  const uploadSettings = useAtomValue(uploadSettingsAtom);

  return useCallback(
    (files: File[]) => {
      actorRef.send({
        type: "files.added",
        files,
        keyTemplate: uploadSettings?.keyTemplate,
        compressOption: uploadSettings?.compressionOption,
      });
    },
    [actorRef, uploadSettings?.compressionOption, uploadSettings?.keyTemplate],
  );
}

export type UploadTestEffects = Partial<UploadQueueEffects>;
