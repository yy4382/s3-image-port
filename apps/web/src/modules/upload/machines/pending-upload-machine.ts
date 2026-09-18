import { assign, fromPromise, setup, type ActorRefFrom } from "xstate";

import { S3KeyMetadata } from "@/lib/s3/s3-key";
import type { CompressOption } from "@/lib/utils/imageCompress";

import {
  isStoredUpload,
  pendingUploadResultSchema,
  type PendingUploadResult,
} from "../types";
import type { createStorePendingUpload } from "../store-pending-upload";

type ProcessPendingUpload = (
  file: File,
  option: CompressOption,
  onProgress: () => void,
) => Promise<File>;

export type PendingUploadEffects = {
  processFile: ProcessPendingUpload;
  storePendingUpload: ReturnType<typeof createStorePendingUpload>;
  onProcessingFailed: (file: File, error: unknown) => void;
};

type PendingUploadInput = PendingUploadEffects & {
  file: File;
  key: S3KeyMetadata;
  compressOption: CompressOption | null;
  id: string;
  supportProcess: boolean;
  preserveKeyBaseOnProcess?: boolean;
};

type PendingUploadContext = PendingUploadInput & {
  processedFile: File | null;
  editing: boolean;
  lastResult: PendingUploadResult | null;
};

type PendingUploadEvent =
  | { type: "process.requested" }
  | { type: "upload.requested" }
  | { type: "retry.requested" }
  | { type: "edit.toggled" }
  | { type: "compression.updated"; option: CompressOption | null }
  | { type: "template.updated"; template: string };

type ProcessedUpload = {
  processedFile: File;
  key: S3KeyMetadata;
};

function shouldProcess(context: PendingUploadContext) {
  return context.supportProcess && context.compressOption !== null;
}

function isProcessedUpload(output: unknown): output is ProcessedUpload {
  return (
    typeof output === "object" &&
    output !== null &&
    "processedFile" in output &&
    output.processedFile instanceof File &&
    "key" in output
  );
}

function isPendingUploadResult(output: unknown): output is PendingUploadResult {
  return pendingUploadResultSchema.safeParse(output).success;
}

export const pendingUploadMachine = setup({
  types: {} as {
    context: PendingUploadContext;
    events: PendingUploadEvent;
    input: PendingUploadInput;
  },
  actors: {
    processPendingUpload: fromPromise<ProcessedUpload, PendingUploadContext>(
      async ({ input }) => {
        const option = input.compressOption;
        if (!input.supportProcess || option === null) {
          throw new Error("Pending upload cannot be processed");
        }
        const processedFile = await input.processFile(
          input.file,
          option,
          () => {},
        );
        return {
          processedFile,
          key: input.preserveKeyBaseOnProcess
            ? S3KeyMetadata.withExt(
                input.key,
                processedFile.name.split(".").pop()?.toLowerCase() ||
                  input.key.data.ext,
              )
            : S3KeyMetadata.updateFile(processedFile, input.key),
        };
      },
    ),
    uploadPendingUpload: fromPromise<PendingUploadResult, PendingUploadContext>(
      ({ input }) => {
        const body = input.processedFile ?? input.file;
        return input.storePendingUpload({
          uploadId: input.id,
          file: input.file,
          body,
          key: input.key.toString(),
        });
      },
    ),
  },
  guards: {
    canProcess: ({ context }) => shouldProcess(context),
    retryProcessingOnly: ({ context }) =>
      context.lastResult?.status === "processing-failed" &&
      !context.lastResult.uploadAfterProcessing,
    isNewUpload: ({ context }) => context.lastResult === null,
    shouldProcessBeforeUpload: ({ context }) =>
      shouldProcess(context) && context.processedFile === null,
    uploadSucceeded: ({ event }) =>
      "output" in event &&
      isPendingUploadResult(event.output) &&
      isStoredUpload(event.output),
  },
  actions: {
    closeEditing: assign({ editing: false }),
    toggleEditing: assign({
      editing: ({ context }) => !context.editing,
    }),
    prepareUpload: assign({ lastResult: null }),
    applyProcessedFile: assign(({ event }) => {
      if (!("output" in event) || !isProcessedUpload(event.output)) {
        return {};
      }
      return {
        processedFile: event.output.processedFile,
        key: event.output.key,
        lastResult: null,
      };
    }),
    resetAfterProcessingFailure: assign(
      ({ context, event }, params: { uploadAfterProcessing: boolean }) => {
        context.onProcessingFailed(
          context.file,
          "error" in event ? event.error : undefined,
        );
        return {
          lastResult: {
            status: "processing-failed",
            ...params,
          } satisfies PendingUploadResult,
        };
      },
    ),
    recordUploadResult: assign(({ event }) => {
      if (!("output" in event) || !isPendingUploadResult(event.output)) {
        return {};
      }
      return {
        lastResult: event.output,
      };
    }),
    resetAfterUploadFailure: assign(({ event }) => {
      if ("output" in event && isPendingUploadResult(event.output)) {
        return {
          lastResult: event.output,
        };
      }
      return {
        lastResult: {
          status: "unconfirmed",
          error: { reason: "unknown", message: "Upload response unavailable" },
        } satisfies PendingUploadResult,
      };
    }),
    updateCompression: assign(({ event }) => {
      if (event.type !== "compression.updated") {
        return {};
      }
      return {
        compressOption: event.option,
        processedFile: null,
        lastResult: null,
      };
    }),
    updateTemplate: assign(({ context, event }) => {
      if (event.type !== "template.updated") {
        return {};
      }
      return {
        key: S3KeyMetadata.updateTemplate(event.template, context.key),
        lastResult: isStoredUpload(context.lastResult)
          ? context.lastResult
          : null,
      };
    }),
  },
}).createMachine({
  id: "pendingUpload",
  context: ({ input }) => ({
    ...input,
    processedFile: null,
    editing: false,
    lastResult: null,
  }),
  initial: "pending",
  states: {
    pending: {
      on: {
        "process.requested": {
          guard: "canProcess",
          target: "processing",
          actions: ["prepareUpload", "closeEditing"],
        },
        "retry.requested": [
          {
            guard: "retryProcessingOnly",
            target: "processing",
            actions: ["prepareUpload", "closeEditing"],
          },
          {
            guard: "shouldProcessBeforeUpload",
            target: "processingBeforeUpload",
            actions: ["prepareUpload", "closeEditing"],
          },
          {
            target: "uploading",
            actions: ["prepareUpload", "closeEditing"],
          },
        ],
        "upload.requested": {
          guard: "isNewUpload",
          target: "startingUpload",
          actions: ["prepareUpload", "closeEditing"],
        },
        "compression.updated": {
          actions: "updateCompression",
        },
        "edit.toggled": { actions: "toggleEditing" },
        "template.updated": {
          actions: "updateTemplate",
        },
      },
    },
    startingUpload: {
      always: [
        {
          guard: "shouldProcessBeforeUpload",
          target: "processingBeforeUpload",
        },
        { target: "uploading" },
      ],
    },
    processed: {
      on: {
        "process.requested": {
          guard: "canProcess",
          target: "processing",
          actions: ["prepareUpload", "closeEditing"],
        },
        "upload.requested": {
          target: "uploading",
          actions: ["prepareUpload", "closeEditing"],
        },
        "compression.updated": {
          target: "pending",
          actions: "updateCompression",
        },
        "edit.toggled": { actions: "toggleEditing" },
        "template.updated": {
          actions: "updateTemplate",
        },
      },
    },
    processing: {
      invoke: {
        src: "processPendingUpload",
        input: ({ context }) => context,
        onDone: {
          target: "processed",
          actions: "applyProcessedFile",
        },
        onError: {
          target: "pending",
          actions: {
            type: "resetAfterProcessingFailure",
            params: { uploadAfterProcessing: false },
          },
        },
      },
    },
    processingBeforeUpload: {
      invoke: {
        src: "processPendingUpload",
        input: ({ context }) => context,
        onDone: {
          target: "uploading",
          actions: "applyProcessedFile",
        },
        onError: {
          target: "pending",
          actions: {
            type: "resetAfterProcessingFailure",
            params: { uploadAfterProcessing: true },
          },
        },
      },
    },
    uploading: {
      invoke: {
        src: "uploadPendingUpload",
        input: ({ context }) => context,
        onDone: [
          {
            guard: "uploadSucceeded",
            target: "uploaded",
            actions: "recordUploadResult",
          },
          {
            target: "pending",
            actions: "resetAfterUploadFailure",
          },
        ],
        onError: {
          target: "pending",
          actions: "resetAfterUploadFailure",
        },
      },
    },
    uploaded: {
      on: {
        "edit.toggled": { actions: "toggleEditing" },
        "template.updated": {
          actions: "updateTemplate",
        },
      },
    },
  },
});

export type PendingUploadActorRef = ActorRefFrom<typeof pendingUploadMachine>;

export function selectPendingUploadStatus(
  snapshot: ReturnType<PendingUploadActorRef["getSnapshot"]>,
) {
  if (
    snapshot.matches("processing") ||
    snapshot.matches("processingBeforeUpload")
  ) {
    return "processing";
  }
  if (snapshot.matches("processed")) {
    return "processed";
  }
  if (snapshot.matches("uploading")) {
    return "uploading";
  }
  if (snapshot.matches("uploaded")) {
    return "uploaded";
  }
  if (snapshot.context.lastResult?.status === "processing-failed")
    return "processing-failed";
  if (snapshot.context.lastResult?.status === "failed") return "failed";
  if (snapshot.context.lastResult?.status === "unconfirmed")
    return "unconfirmed";
  return "pending";
}

export function selectPendingUpload(
  snapshot: ReturnType<PendingUploadActorRef["getSnapshot"]>,
) {
  return {
    file: snapshot.context.file,
    processedFile: snapshot.context.processedFile,
    key: snapshot.context.key,
    compressOption: snapshot.context.compressOption,
    status: selectPendingUploadStatus(snapshot),
    id: snapshot.context.id,
    supportProcess: snapshot.context.supportProcess,
    editing: snapshot.context.editing,
    lastResult: snapshot.context.lastResult,
  };
}
