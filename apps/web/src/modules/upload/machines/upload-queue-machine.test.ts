import { beforeEach, describe, expect, test, vi } from "vitest";
import { createActor, waitFor } from "xstate";

import { createDeferred } from "@/test/helpers/deterministic";

import {
  selectHasUploaded,
  selectUploadActors,
  uploadQueueMachine,
} from "./upload-queue-machine";
import {
  selectPendingUpload,
  selectPendingUploadStatus,
  type PendingUploadEffects,
} from "./pending-upload-machine";

const mocks = {
  processFile: vi.fn(),
  onProcessingFailed: vi.fn(),
  storePendingUpload: vi.fn<PendingUploadEffects["storePendingUpload"]>(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.storePendingUpload.mockImplementation(async ({ key }) => ({
    status: "stored",
    image: { key },
  }));
  mocks.processFile.mockImplementation((file: File) => {
    return Promise.resolve(
      new File([file], `processed-${file.name}`, { type: file.type }),
    );
  });
});

describe("uploadQueueMachine", () => {
  test("starts with an empty upload queue", () => {
    const actor = createUploadQueueActor();

    expect(selectUploadActors(actor.getSnapshot())).toEqual([]);
  });

  test("adds files as pending uploads with generated keys", async () => {
    const actor = createUploadQueueActor();

    actor.send({
      type: "files.added",
      files: [createTestFile("test1.jpg"), createTestFile("test2.png")],
      keyTemplate: "{{filename}}.{{ext}}",
      compressOption: null,
    });

    const uploads = selectUploadActors(actor.getSnapshot());
    expect(uploads).toHaveLength(2);
    expect(new Set(uploads.map((upload) => upload.id)).size).toBe(2);
    expect(selectPendingUpload(uploads[0].getSnapshot())).toMatchObject({
      status: "pending",
    });
    expect(
      selectPendingUpload(uploads[0].getSnapshot()).key.toString(),
    ).toContain("jpg");
  });

  test("processes a pending upload", async () => {
    const actor = createUploadQueueActor();
    actor.send({
      type: "files.added",
      files: [createTestFile("test.jpg")],
      keyTemplate: "{{filename}}.{{ext}}",
      compressOption: { type: "jpeg", quality: 80 },
    });
    const upload = selectUploadActors(actor.getSnapshot())[0];

    upload.send({ type: "process.requested" });

    await waitFor(upload, (snapshot) => snapshot.matches("processed"));
    const pendingUpload = selectPendingUpload(upload.getSnapshot());
    expect(pendingUpload.status).toBe("processed");
    expect(pendingUpload.processedFile?.name).toBe("processed-test.jpg");
    expect(pendingUpload.key.toString()).toBe("processed-test.jpg.jpg");
  });

  test("stores a pending upload through the deep upload operation", async () => {
    const actor = createUploadQueueActor();
    actor.send({
      type: "files.added",
      files: [createTestFile("test.jpg")],
      keyTemplate: "test/{{filename}}.{{ext}}",
      compressOption: null,
    });
    const upload = selectUploadActors(actor.getSnapshot())[0];

    upload.send({ type: "upload.requested" });

    await waitFor(upload, (snapshot) => snapshot.matches("uploaded"));
    expect(mocks.storePendingUpload).toHaveBeenCalledWith({
      uploadId: upload.id,
      file: expect.any(File),
      body: expect.any(File),
      key: "test/test.jpg",
    });
    expect(selectHasUploaded(actor.getSnapshot())).toBe(true);
  });

  test("processes before upload when compression is enabled", async () => {
    const actor = createUploadQueueActor();
    actor.send({
      type: "files.added",
      files: [createTestFile("test.jpg")],
      keyTemplate: "{{filename}}.{{ext}}",
      compressOption: { type: "jpeg", quality: 80 },
    });
    const upload = selectUploadActors(actor.getSnapshot())[0];

    upload.send({ type: "upload.requested" });

    await waitFor(upload, (snapshot) => snapshot.matches("uploaded"));
    expect(mocks.processFile).toHaveBeenCalled();
    expect(mocks.storePendingUpload).toHaveBeenCalledWith({
      uploadId: upload.id,
      file: expect.any(File),
      body: expect.objectContaining({ name: "processed-test.jpg" }),
      key: "processed-test.jpg.jpg",
    });
  });

  test("starts the deep upload operation only after processing finishes", async () => {
    const processed = createDeferred<File>();
    const storePendingUpload = vi.fn<
      PendingUploadEffects["storePendingUpload"]
    >(async ({ key }) => ({ status: "stored", image: { key } }));
    const actor = createUploadQueueActor({
      processFile: () => processed.promise,
      storePendingUpload,
    });
    actor.send({
      type: "files.added",
      files: [createTestFile("delayed.jpg")],
      keyTemplate: "{{filename}}.{{ext}}",
      compressOption: { type: "jpeg", quality: 80 },
    });
    const upload = selectUploadActors(actor.getSnapshot())[0];

    upload.send({ type: "upload.requested" });
    await waitFor(upload, (snapshot) =>
      snapshot.matches("processingBeforeUpload"),
    );
    expect(storePendingUpload).not.toHaveBeenCalled();
    processed.resolve(
      new File(["processed"], "processed-delayed.jpg", {
        type: "image/jpeg",
      }),
    );
    await waitFor(upload, (snapshot) => snapshot.matches("uploaded"));

    expect(storePendingUpload).toHaveBeenCalledOnce();
    expect(storePendingUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ name: "processed-delayed.jpg" }),
      }),
    );
  });

  test.each(["processing", "uploading"] as const)(
    "rejects editing while a pending upload is %s",
    async (phase) => {
      const processing = createDeferred<File>();
      const storing = createDeferred<{
        status: "stored";
        image: { key: string };
      }>();
      const actor = createUploadQueueActor({
        processFile: () => processing.promise,
        storePendingUpload: () => storing.promise,
      });
      actor.send({
        type: "files.added",
        files: [createTestFile(`${phase}.jpg`)],
        keyTemplate: "before/{{filename}}.{{ext}}",
        compressOption:
          phase === "processing" ? { type: "jpeg", quality: 80 } : null,
      });
      const upload = selectUploadActors(actor.getSnapshot())[0];
      const before = selectPendingUpload(upload.getSnapshot());

      upload.send({
        type: phase === "processing" ? "process.requested" : "upload.requested",
      });
      await waitFor(upload, (snapshot) => snapshot.matches(phase));
      upload.send({
        type: "compression.updated",
        option: { type: "jpeg", quality: 10 },
      });
      upload.send({ type: "template.updated", template: "after/{name}" });

      const after = selectPendingUpload(upload.getSnapshot());
      expect(after.key.template).toBe(before.key.template);
      expect(after.compressOption).toEqual(before.compressOption);

      if (phase === "processing") {
        processing.resolve(createTestFile("processed.jpg"));
        await waitFor(upload, (snapshot) => snapshot.matches("processed"));
      } else {
        storing.resolve({
          status: "stored",
          image: { key: before.key.toString() },
        });
        await waitFor(upload, (snapshot) => snapshot.matches("uploaded"));
      }
    },
  );

  test("returns to pending when upload fails", async () => {
    const actor = createUploadQueueActor({
      storePendingUpload: async () => ({
        status: "failed",
        error: { reason: "access-denied" },
      }),
    });
    actor.send({
      type: "files.added",
      files: [createTestFile("test.jpg")],
      keyTemplate: "{{filename}}.{{ext}}",
      compressOption: null,
    });
    const upload = selectUploadActors(actor.getSnapshot())[0];

    upload.send({ type: "upload.requested" });

    await waitFor(upload, (snapshot) => snapshot.matches("pending"));
    expect(selectPendingUploadStatus(upload.getSnapshot())).toBe("pending");
  });

  test("does not mark an upload complete when catalog acceptance is superseded", async () => {
    const storedImage = createDeferred<{
      status: "failed";
      error: { reason: "superseded" };
    }>();
    const storePendingUpload = vi.fn(() => storedImage.promise);
    const actor = createUploadQueueActor({
      storePendingUpload,
    });
    actor.send({
      type: "files.added",
      files: [createTestFile("obsolete.jpg")],
      keyTemplate: "{{filename}}.{{ext}}",
      compressOption: null,
    });
    const upload = selectUploadActors(actor.getSnapshot())[0];

    upload.send({ type: "upload.requested" });
    await waitFor(upload, (snapshot) => snapshot.matches("uploading"));
    storedImage.resolve({
      status: "failed",
      error: { reason: "superseded" },
    });
    await waitFor(upload, (snapshot) => !snapshot.matches("uploading"));

    expect(storePendingUpload).toHaveBeenCalledTimes(1);
    expect(selectPendingUploadStatus(upload.getSnapshot())).toBe("pending");
    expect(selectHasUploaded(actor.getSnapshot())).toBe(false);
  });

  test("keeps a current remote success uploaded while catalog reconciliation is pending", async () => {
    const storePendingUpload = vi.fn(async () => ({
      status: "stored-unreconciled" as const,
      image: { key: "stored.jpg" },
    }));
    const actor = createUploadQueueActor({ storePendingUpload });
    actor.send({
      type: "files.added",
      files: [createTestFile("stored.jpg")],
      keyTemplate: "{{filename}}.{{ext}}",
      compressOption: null,
    });
    const upload = selectUploadActors(actor.getSnapshot())[0];

    upload.send({ type: "upload.requested" });
    await waitFor(upload, (snapshot) => snapshot.matches("uploaded"));

    expect(storePendingUpload).toHaveBeenCalledTimes(1);
    expect(selectPendingUpload(upload.getSnapshot()).lastResult).toEqual({
      status: "stored-unreconciled",
      image: { key: "stored.jpg" },
    });
  });

  test("uploads all retryable uploads", async () => {
    const actor = createUploadQueueActor();
    actor.send({
      type: "files.added",
      files: [createTestFile("test1.jpg"), createTestFile("test2.jpg")],
      keyTemplate: "test/{{filename}}.{{ext}}",
      compressOption: null,
    });

    actor.send({ type: "all.uploadRequested" });

    const uploads = selectUploadActors(actor.getSnapshot());
    await Promise.all(
      uploads.map((upload) =>
        waitFor(upload, (snapshot) => snapshot.matches("uploaded")),
      ),
    );
    expect(mocks.storePendingUpload).toHaveBeenCalledTimes(2);
  });

  test("clears uploaded items without removing pending uploads", async () => {
    const actor = createUploadQueueActor();
    actor.send({
      type: "files.added",
      files: [createTestFile("uploaded.jpg"), createTestFile("pending.jpg")],
      keyTemplate: "{{filename}}.{{ext}}",
      compressOption: null,
    });
    const uploads = selectUploadActors(actor.getSnapshot());
    uploads[0].send({ type: "upload.requested" });
    await waitFor(uploads[0], (snapshot) => snapshot.matches("uploaded"));

    actor.send({ type: "uploaded.cleared" });

    const remainingUploads = selectUploadActors(actor.getSnapshot());
    expect(remainingUploads).toHaveLength(1);
    expect(
      selectPendingUpload(remainingUploads[0].getSnapshot()).file.name,
    ).toBe("pending.jpg");
  });
});

function createUploadQueueActor(effects: Partial<PendingUploadEffects> = {}) {
  return createActor(uploadQueueMachine, {
    input: {
      effects: {
        processFile: mocks.processFile,
        storePendingUpload: mocks.storePendingUpload,
        onProcessingFailed: mocks.onProcessingFailed,
        ...effects,
      },
    },
  }).start();
}

function createTestFile(name: string, type = "image/jpeg"): File {
  return new File(["test content"], name, { type });
}
