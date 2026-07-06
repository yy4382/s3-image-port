import { assign, fromPromise, setup, type ActorRefFrom } from "xstate";

import type {
  CreateImageStorageFromSettings,
  ImageStorageFailure,
} from "@/modules/image-storage";
import { S3KeyMetadata } from "@/lib/s3/s3-key";
import type { CompressOption } from "@/lib/utils/imageCompress";
import type { S3Options } from "@/stores/schemas/settings";

import type {
  PendingUpload,
  PendingUploadResult,
  PendingUploadStatus,
} from "../types";

export type ProcessPendingUpload = (
  file: File,
  option: CompressOption,
  onProgress: () => void,
) => Promise<File>;

export type PendingUploadEffects = {
  processFile: ProcessPendingUpload;
  createStorage: CreateImageStorageFromSettings;
  onProcessingFailed: (file: File, error: unknown) => void;
  onUploadFailed: (file: File, error: unknown) => void;
  onUploadSucceeded: (file: File) => void;
};

export type PendingUploadInput = PendingUploadEffects & {
  file: File;
  key: S3KeyMetadata;
  compressOption: CompressOption | null;
  id: string;
  supportProcess: boolean;
};

type UploadRequest = {
  s3Settings: S3Options;
};

type PendingUploadContext = PendingUploadInput & {
  processedFile: File | null;
  uploadRequest: UploadRequest | null;
  lastResult: PendingUploadResult | null;
};

type PendingUploadEvent =
  | { type: "process.requested" }
  | { type: "upload.requested"; s3Settings: S3Options }
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
  return (
    typeof output === "object" &&
    output !== null &&
    "success" in output &&
    typeof output.success === "boolean"
  );
}

function toFailureReason(error: unknown): ImageStorageFailure["reason"] {
  if (
    typeof error === "object" &&
    error !== null &&
    "reason" in error &&
    typeof error.reason === "string"
  ) {
    return error.reason as ImageStorageFailure["reason"];
  }
  return "unknown";
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
          key: S3KeyMetadata.updateFile(processedFile, input.key),
        };
      },
    ),
    uploadPendingUpload: fromPromise<PendingUploadResult, PendingUploadContext>(
      async ({ input }) => {
        if (!input.uploadRequest) {
          return { success: false, error: "not-configured" };
        }
        const body = input.processedFile ?? input.file;
        try {
          const result = await input
            .createStorage(input.uploadRequest.s3Settings)
            .putStoredImage({
              key: input.key.toString(),
              body,
              contentType: body.type || undefined,
            });
          if (result.ok) {
            return { success: true };
          }
          input.onUploadFailed(input.file, result.error);
          return { success: false, error: result.error.reason };
        } catch (error) {
          input.onUploadFailed(input.file, error);
          return { success: false, error: "unknown" };
        }
      },
    ),
  },
  guards: {
    canProcess: ({ context }) => shouldProcess(context),
    shouldProcessBeforeUpload: ({ context }) =>
      shouldProcess(context) && context.processedFile === null,
    uploadSucceeded: ({ event }) =>
      "output" in event &&
      isPendingUploadResult(event.output) &&
      event.output.success === true,
  },
  actions: {
    rememberUploadRequest: assign(({ event }) => {
      if (event.type !== "upload.requested") {
        return {};
      }
      return {
        uploadRequest: {
          s3Settings: event.s3Settings,
        },
        lastResult: null,
      };
    }),
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
    resetAfterProcessingFailure: assign(({ context, event }) => {
      const error = "error" in event ? event.error : undefined;
      context.onProcessingFailed(context.file, error);
      return {
        lastResult: {
          success: false,
          error: "unknown",
        } satisfies PendingUploadResult,
      };
    }),
    recordUploadResult: assign(({ event }) => {
      if (!("output" in event) || !isPendingUploadResult(event.output)) {
        return {};
      }
      return {
        lastResult: event.output,
      };
    }),
    notifyUploadSucceeded: ({ context }) => {
      context.onUploadSucceeded(context.file);
    },
    resetAfterUploadFailure: assign(({ event }) => {
      if ("output" in event && isPendingUploadResult(event.output)) {
        return {
          lastResult: event.output,
        };
      }
      const error = "error" in event ? event.error : undefined;
      return {
        lastResult: {
          success: false,
          error: toFailureReason(error),
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
      };
    }),
  },
}).createMachine({
  id: "pendingUpload",
  context: ({ input }) => ({
    ...input,
    processedFile: null,
    uploadRequest: null,
    lastResult: null,
  }),
  initial: "pending",
  states: {
    pending: {
      on: {
        "process.requested": {
          guard: "canProcess",
          target: "processing",
        },
        "upload.requested": [
          {
            guard: "shouldProcessBeforeUpload",
            target: "processingBeforeUpload",
            actions: "rememberUploadRequest",
          },
          {
            target: "uploading",
            actions: "rememberUploadRequest",
          },
        ],
        "compression.updated": {
          actions: "updateCompression",
        },
        "template.updated": {
          actions: "updateTemplate",
        },
      },
    },
    processed: {
      on: {
        "process.requested": {
          guard: "canProcess",
          target: "processing",
        },
        "upload.requested": {
          target: "uploading",
          actions: "rememberUploadRequest",
        },
        "compression.updated": {
          target: "pending",
          actions: "updateCompression",
        },
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
          actions: "resetAfterProcessingFailure",
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
          actions: "resetAfterProcessingFailure",
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
            actions: ["recordUploadResult", "notifyUploadSucceeded"],
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
        "compression.updated": {
          target: "pending",
          actions: "updateCompression",
        },
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
): PendingUploadStatus {
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
  return "pending";
}

export function selectPendingUpload(
  snapshot: ReturnType<PendingUploadActorRef["getSnapshot"]>,
): PendingUpload {
  return {
    file: snapshot.context.file,
    processedFile: snapshot.context.processedFile,
    key: snapshot.context.key,
    compressOption: snapshot.context.compressOption,
    status: selectPendingUploadStatus(snapshot),
    id: snapshot.context.id,
    supportProcess: snapshot.context.supportProcess,
  };
}
