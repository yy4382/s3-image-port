import { describe, expect, it, vi } from "vitest";
import { createActor, waitFor } from "xstate";
import { createDeferred } from "@/test/helpers/deterministic";
import { uploadReceipt } from "@/test/helpers/upload";
import {
  selectUploadActors,
  selectUploadCounts,
  uploadQueueMachine,
} from "./upload-queue-machine";
import {
  selectPendingUpload,
  type PendingUploadEffects,
} from "./pending-upload-machine";
import type { PendingUploadResult } from "../types";

function queue(
  effects: Partial<PendingUploadEffects> = {},
  count = 1,
  compression = false,
) {
  const actor = createActor(uploadQueueMachine, {
    input: {
      effects: {
        processFile: async (file) => file,
        storePendingUpload: async ({ key }) => ({
          status: "stored",
          image: { key },
          receipt: uploadReceipt,
        }),
        onProcessingFailed: vi.fn(),
        ...effects,
      },
    },
  }).start();
  actor.send({
    type: "files.added",
    files: Array.from(
      { length: count },
      (_, i) => new File(["original"], `${i}.jpg`, { type: "image/jpeg" }),
    ),
    keyTemplate: "{{ulid}}.{{ext}}",
    compressOption: compression ? { type: "webp", quality: 70 } : null,
  });
  return { actor, uploads: selectUploadActors(actor.getSnapshot()) };
}

const finished = (upload: ReturnType<typeof queue>["uploads"][number]) =>
  waitFor(upload, (s) => s.context.lastResult !== null);

describe("pending upload recovery", () => {
  it("retries only two explicit failures out of ten, preserving keys and ignoring repeated clicks in flight", async () => {
    const retried = createDeferred<PendingUploadResult>();
    const storePendingUpload = vi.fn<
      PendingUploadEffects["storePendingUpload"]
    >(async ({ file, key }) =>
      Number(file.name[0]) < 8
        ? { status: "stored", image: { key }, receipt: uploadReceipt }
        : { status: "failed", error: { reason: "access-denied" } },
    );
    const { actor, uploads } = queue({ storePendingUpload }, 10);
    actor.send({ type: "all.uploadRequested" });
    actor.send({ type: "all.uploadRequested" });
    await Promise.all(uploads.map(finished));
    expect(storePendingUpload).toHaveBeenCalledTimes(10);
    expect(selectUploadCounts(actor.getSnapshot())).toMatchObject({
      uploaded: 8,
      failed: 2,
    });
    const originalKeys = storePendingUpload.mock.calls
      .slice(8)
      .map(([input]) => input.key);
    storePendingUpload.mockImplementation(() => retried.promise);
    actor.send({ type: "all.uploadRequested" });
    expect(storePendingUpload).toHaveBeenCalledTimes(10);
    actor.send({ type: "failed.retryRequested" });
    actor.send({ type: "failed.retryRequested" });
    uploads[8].send({ type: "retry.requested" });
    actor.send({ type: "all.uploadRequested" });
    expect(storePendingUpload).toHaveBeenCalledTimes(12);
    expect(
      storePendingUpload.mock.calls.slice(10).map(([input]) => input.key),
    ).toEqual(originalKeys);
    expect(selectPendingUpload(uploads[8].getSnapshot()).lastResult).toBeNull();
    retried.resolve({ status: "failed", error: { reason: "not-configured" } });
    await Promise.all(uploads.slice(8).map(finished));
    expect(
      selectPendingUpload(uploads[8].getSnapshot()).lastResult,
    ).toMatchObject({ error: { reason: "not-configured" } });
    actor.stop();
  });

  it("requires explicit single-item retry for a lost response and never probes the object", async () => {
    const storePendingUpload = vi.fn<
      PendingUploadEffects["storePendingUpload"]
    >(async () => ({
      status: "unconfirmed",
      error: { reason: "unknown", message: "Network error" },
    }));
    const {
      actor,
      uploads: [upload],
    } = queue({ storePendingUpload });
    actor.send({ type: "all.uploadRequested" });
    await finished(upload);
    actor.send({ type: "all.uploadRequested" });
    actor.send({ type: "failed.retryRequested" });
    upload.send({ type: "upload.requested" });
    expect(storePendingUpload).toHaveBeenCalledTimes(1);
    upload.send({ type: "retry.requested" });
    await finished(upload);
    expect(storePendingUpload).toHaveBeenCalledTimes(2);
    expect(storePendingUpload.mock.calls[1][0]).toEqual(
      storePendingUpload.mock.calls[0][0],
    );
    actor.stop();
  });

  it.each(["process.requested", "upload.requested"] as const)(
    "retries failed %s with the original file and chosen processing options",
    async (event) => {
      const processFile = vi
        .fn<PendingUploadEffects["processFile"]>()
        .mockRejectedValueOnce(new Error("decode failed"));
      const storePendingUpload = vi.fn<
        PendingUploadEffects["storePendingUpload"]
      >(async ({ key }) => ({
        status: "stored",
        image: { key },
        receipt: uploadReceipt,
      }));
      const {
        actor,
        uploads: [upload],
      } = queue({ processFile, storePendingUpload }, 1, true);
      const before = selectPendingUpload(upload.getSnapshot());
      upload.send({ type: event });
      await finished(upload);
      expect(selectPendingUpload(upload.getSnapshot()).status).toBe(
        "processing-failed",
      );
      expect(storePendingUpload).not.toHaveBeenCalled();
      const processed = createDeferred<File>();
      processFile.mockImplementation(() => processed.promise);
      actor.send({ type: "failed.retryRequested" });
      upload.send({ type: "retry.requested" });
      actor.send({ type: "all.uploadRequested" });
      expect(processFile).toHaveBeenCalledTimes(2);
      expect(processFile.mock.calls[1][0]).toBe(before.file);
      expect(processFile.mock.calls[1][1]).toEqual(before.compressOption);
      expect(selectPendingUpload(upload.getSnapshot()).lastResult).toBeNull();
      const body = new File(["processed"], "result.webp", {
        type: "image/webp",
      });
      processed.resolve(body);
      await waitFor(upload, (s) =>
        s.matches(event === "process.requested" ? "processed" : "uploaded"),
      );
      expect(storePendingUpload).toHaveBeenCalledTimes(
        event === "process.requested" ? 0 : 1,
      );
      if (event === "upload.requested")
        expect(storePendingUpload.mock.calls[0][0].body).toBe(body);
      expect(selectPendingUpload(upload.getSnapshot()).file).toBe(before.file);
      actor.stop();
    },
  );

  it("does not process twice on PUT retry, and uses an explicitly edited template", async () => {
    const processFile = vi.fn<PendingUploadEffects["processFile"]>(
      async () =>
        new File(["processed"], "result.webp", { type: "image/webp" }),
    );
    const storePendingUpload = vi.fn<
      PendingUploadEffects["storePendingUpload"]
    >(async () => ({ status: "failed", error: { reason: "access-denied" } }));
    const {
      actor,
      uploads: [upload],
    } = queue({ processFile, storePendingUpload }, 1, true);
    actor.send({ type: "all.uploadRequested" });
    await finished(upload);
    upload.send({ type: "retry.requested" });
    await finished(upload);
    expect(processFile).toHaveBeenCalledTimes(1);
    expect(storePendingUpload.mock.calls[1][0]).toEqual(
      storePendingUpload.mock.calls[0][0],
    );
    upload.send({
      type: "template.updated",
      template: "changed/{{ulid}}.{{ext}}",
    });
    expect(selectPendingUpload(upload.getSnapshot()).lastResult).toBeNull();
    upload.send({ type: "upload.requested" });
    await finished(upload);
    expect(storePendingUpload.mock.calls[2][0].key).toBe(
      `changed/${storePendingUpload.mock.calls[0][0].key}`,
    );
    actor.stop();
  });

  it.each(["stored-unreconciled", "stored-previous-target"] as const)(
    "excludes %s from all retry paths after edits",
    async (status) => {
      const storePendingUpload = vi.fn<
        PendingUploadEffects["storePendingUpload"]
      >(async ({ key }) => ({
        status,
        image: { key },
        receipt: uploadReceipt,
      }));
      const {
        actor,
        uploads: [upload],
      } = queue({ storePendingUpload });
      actor.send({ type: "all.uploadRequested" });
      await finished(upload);
      const result = selectPendingUpload(upload.getSnapshot()).lastResult;
      upload.send({ type: "template.updated", template: "different/{{ulid}}" });
      upload.send({ type: "compression.updated", option: null });
      actor.send({ type: "all.uploadRequested" });
      actor.send({ type: "failed.retryRequested" });
      upload.send({ type: "retry.requested" });
      expect(selectPendingUpload(upload.getSnapshot()).lastResult).toBe(result);
      expect(storePendingUpload).toHaveBeenCalledTimes(1);
      actor.stop();
    },
  );
});
