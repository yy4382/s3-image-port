import { beforeEach, describe, expect, test, vi } from "vitest";
import { createActor, waitFor } from "xstate";

import {
  type ImageStorage,
  type PutStoredImageInput,
} from "@/modules/image-storage";
import { createMemoryImageStorageAdapter } from "@/modules/image-storage/adapters/memory";
import type { S3Options } from "@/stores/schemas/settings";

import {
  selectHasUploaded,
  selectUploadActors,
  uploadQueueMachine,
  type UploadQueueEffects,
} from "./upload-queue-machine";
import {
  selectPendingUpload,
  selectPendingUploadStatus,
} from "./pending-upload-machine";

const mockS3Settings: S3Options = {
  endpoint: "https://s3.example.com",
  bucket: "test-bucket",
  region: "us-east-1",
  accKeyId: "test-key",
  secretAccKey: "test-secret",
  forcePathStyle: false,
  pubUrl: "https://cdn.example.com",
  includePath: "",
};

const mocks = {
  putStoredImage: vi.fn(),
  processFile: vi.fn(),
  onProcessingFailed: vi.fn(),
  onUploadFailed: vi.fn(),
  onUploadSucceeded: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
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

  test("uploads a pending upload and marks stored images stale", async () => {
    const actor = createUploadQueueActor();
    actor.send({
      type: "files.added",
      files: [createTestFile("test.jpg")],
      keyTemplate: "test/{{filename}}.{{ext}}",
      compressOption: null,
    });
    const upload = selectUploadActors(actor.getSnapshot())[0];

    upload.send({ type: "upload.requested", s3Settings: mockS3Settings });

    await waitFor(upload, (snapshot) => snapshot.matches("uploaded"));
    expect(mocks.putStoredImage).toHaveBeenCalledWith({
      key: "test/test.jpg",
      body: expect.anything(),
      contentType: "image/jpeg",
    });
    expect(mocks.onUploadSucceeded).toHaveBeenCalledWith(expect.any(File));
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

    upload.send({ type: "upload.requested", s3Settings: mockS3Settings });

    await waitFor(upload, (snapshot) => snapshot.matches("uploaded"));
    expect(mocks.processFile).toHaveBeenCalled();
    expect(mocks.putStoredImage).toHaveBeenCalledWith({
      key: "processed-test.jpg.jpg",
      body: expect.anything(),
      contentType: "image/jpeg",
    });
  });

  test("returns to pending when upload fails", async () => {
    const storage = createFailingUploadStorage();
    const actor = createUploadQueueActor({
      createStorage: () => storage,
    });
    actor.send({
      type: "files.added",
      files: [createTestFile("test.jpg")],
      keyTemplate: "{{filename}}.{{ext}}",
      compressOption: null,
    });
    const upload = selectUploadActors(actor.getSnapshot())[0];

    upload.send({ type: "upload.requested", s3Settings: mockS3Settings });

    await waitFor(upload, (snapshot) => snapshot.matches("pending"));
    expect(selectPendingUploadStatus(upload.getSnapshot())).toBe("pending");
    expect(mocks.onUploadSucceeded).not.toHaveBeenCalled();
  });

  test("uploads all retryable uploads", async () => {
    const actor = createUploadQueueActor();
    actor.send({
      type: "files.added",
      files: [createTestFile("test1.jpg"), createTestFile("test2.jpg")],
      keyTemplate: "test/{{filename}}.{{ext}}",
      compressOption: null,
    });

    actor.send({ type: "all.uploadRequested", s3Settings: mockS3Settings });

    const uploads = selectUploadActors(actor.getSnapshot());
    await Promise.all(
      uploads.map((upload) =>
        waitFor(upload, (snapshot) => snapshot.matches("uploaded")),
      ),
    );
    expect(mocks.putStoredImage).toHaveBeenCalledTimes(2);
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
    uploads[0].send({ type: "upload.requested", s3Settings: mockS3Settings });
    await waitFor(uploads[0], (snapshot) => snapshot.matches("uploaded"));

    actor.send({ type: "uploaded.cleared" });

    const remainingUploads = selectUploadActors(actor.getSnapshot());
    expect(remainingUploads).toHaveLength(1);
    expect(
      selectPendingUpload(remainingUploads[0].getSnapshot()).file.name,
    ).toBe("pending.jpg");
  });
});

function createUploadQueueActor(effects: Partial<UploadQueueEffects> = {}) {
  return createActor(uploadQueueMachine, {
    input: {
      effects: {
        processFile: mocks.processFile,
        createStorage: () => createRecordingStorage(),
        onProcessingFailed: mocks.onProcessingFailed,
        onUploadFailed: mocks.onUploadFailed,
        onUploadSucceeded: mocks.onUploadSucceeded,
        ...effects,
      },
    },
  }).start();
}

function createTestFile(name: string, type = "image/jpeg"): File {
  return new File(["test content"], name, { type });
}

function createRecordingStorage(): ImageStorage {
  const adapter = createMemoryImageStorageAdapter();
  return {
    ...adapter,
    async putStoredImage(input: PutStoredImageInput) {
      mocks.putStoredImage(input);
      return adapter.putStoredImage(input);
    },
  };
}

function createFailingUploadStorage(): ImageStorage {
  const storage = createRecordingStorage();
  return {
    ...storage,
    async putStoredImage(input) {
      mocks.putStoredImage(input);
      return { ok: false, error: { reason: "access-denied" } };
    },
  };
}
