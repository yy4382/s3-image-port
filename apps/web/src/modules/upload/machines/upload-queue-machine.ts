import {
  assign,
  enqueueActions,
  setup,
  stopChild,
  type ActorRefFrom,
} from "xstate";
import { monotonicFactory } from "ulid";
import { v4 as uuid } from "uuid";

import { defaultKeyTemplate, S3KeyMetadata } from "@/lib/s3/s3-key";
import { planLivePhotoUpload, splitKeyExt } from "@/lib/live-photo/live-photo";
import { isSupportedFileType } from "@/lib/utils/imageCompress";
import type { CompressOption } from "@/lib/utils/imageCompress";

import {
  pendingUploadMachine,
  selectPendingUploadStatus,
  type PendingUploadActorRef,
  type PendingUploadEffects,
} from "./pending-upload-machine";

type UploadQueueContext = {
  uploads: PendingUploadActorRef[];
  effects: PendingUploadEffects;
};

type UploadQueueInput = {
  effects: PendingUploadEffects;
};

export type UploadQueueEvent =
  | {
      type: "files.added";
      files: File[];
      keyTemplate: string | undefined;
      compressOption: CompressOption | null | undefined;
    }
  | { type: "upload.removed"; actorRef: PendingUploadActorRef }
  | { type: "uploaded.cleared" }
  | { type: "all.uploadRequested" };

export const uploadQueueMachine = setup({
  types: {} as {
    context: UploadQueueContext;
    events: UploadQueueEvent;
    input: UploadQueueInput;
  },
  actors: {
    pendingUpload: pendingUploadMachine,
  },
  actions: {
    addFiles: assign({
      uploads: ({ context, event, spawn }) => {
        if (event.type !== "files.added") {
          return context.uploads;
        }
        const nextKeyId = monotonicFactory();
        const keyTemplate = event.keyTemplate ?? defaultKeyTemplate;
        const compressOption = event.compressOption ?? null;
        const roles = planLivePhotoUpload(event.files);
        const ids = event.files.map(() => uuid());
        const keys = new Array<S3KeyMetadata>(event.files.length);
        event.files.forEach((file, index) => {
          if (roles[index].type === "motion") return;
          const key = S3KeyMetadata.create(file, keyTemplate, nextKeyId);
          keys[index] =
            roles[index].type === "still"
              ? S3KeyMetadata.withExt(
                  key,
                  splitKeyExt(file.name).ext || key.data.ext,
                )
              : key;
        });
        event.files.forEach((file, index) => {
          const role = roles[index];
          if (role.type !== "motion") return;
          keys[index] = S3KeyMetadata.withExt(
            keys[role.stillIndex],
            splitKeyExt(file.name).ext || "mov",
          );
        });
        const newUploads = event.files.map((file, index) => {
          const id = ids[index];
          return spawn("pendingUpload", {
            id,
            syncSnapshot: true,
            input: {
              ...context.effects,
              file,
              key: keys[index],
              compressOption,
              id,
              supportProcess: isSupportedFileType(file),
              preserveKeyBaseOnProcess: roles[index].type !== "single",
            },
          });
        });
        return [...context.uploads, ...newUploads];
      },
    }),
    removeUpload: assign({
      uploads: ({ context, event }) => {
        if (event.type !== "upload.removed") {
          return context.uploads;
        }
        return context.uploads.filter((upload) => upload !== event.actorRef);
      },
    }),
    clearUploaded: assign({
      uploads: ({ context }) => {
        return context.uploads.filter(
          (upload) =>
            selectPendingUploadStatus(upload.getSnapshot()) !== "uploaded",
        );
      },
    }),
    stopUploadedChildren: enqueueActions(({ context, enqueue }) => {
      for (const upload of context.uploads) {
        if (selectPendingUploadStatus(upload.getSnapshot()) === "uploaded") {
          enqueue.stopChild(upload);
        }
      }
    }),
    requestAllUploads: ({ context, event }) => {
      if (event.type !== "all.uploadRequested") {
        return;
      }
      for (const upload of context.uploads) {
        const status = selectPendingUploadStatus(upload.getSnapshot());
        if (status !== "uploading" && status !== "uploaded") {
          upload.send({
            type: "upload.requested",
          });
        }
      }
    },
  },
}).createMachine({
  id: "uploadQueue",
  context: ({ input }) => ({
    uploads: [],
    effects: input.effects,
  }),
  on: {
    "files.added": {
      actions: "addFiles",
    },
    "upload.removed": {
      actions: [stopChild(({ event }) => event.actorRef), "removeUpload"],
    },
    "uploaded.cleared": {
      actions: ["stopUploadedChildren", "clearUploaded"],
    },
    "all.uploadRequested": {
      actions: "requestAllUploads",
    },
  },
});

type UploadQueueActorRef = ActorRefFrom<typeof uploadQueueMachine>;

export function selectUploadActors(
  snapshot: ReturnType<UploadQueueActorRef["getSnapshot"]>,
) {
  return snapshot.context.uploads;
}

export function selectHasUploaded(
  snapshot: ReturnType<UploadQueueActorRef["getSnapshot"]>,
) {
  return snapshot.context.uploads.some(
    (upload) => selectPendingUploadStatus(upload.getSnapshot()) === "uploaded",
  );
}
