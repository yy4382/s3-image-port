import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/../test/utils/render-browser";
import { getDefaultStore, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useLayoutEffect, useState } from "react";

import { createMemoryImageStorageAdapter } from "@/modules/image-storage/adapters/memory";
import { settings } from "@/stores/atoms/settings";
import { getDefaultOptions } from "@/stores/schemas/settings";
import { produce } from "immer";
import { createDeferred } from "@/test/helpers/deterministic";

import { Upload, UploadContent } from "./upload";
import { createUploadQueue, uploadQueue } from "./upload-queue";
import type { PendingUploadEffects } from "./machines/pending-upload-machine";
import { createStorePendingUpload } from "./store-pending-upload";

const mocks = vi.hoisted(() => {
  return {
    putStoredImageFn: vi.fn(),
    processFileFn: vi.fn().mockImplementation((file: File) => {
      return Promise.resolve(file);
    }),
    copyFn: vi.fn(),
    toastErrorFn: vi.fn(),
  };
});

vi.mock(import("@tanstack/react-router"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    ClientOnly: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    Link: (props) => (
      <a href={props.href ?? props.to?.toString() ?? ""}>
        {props.children as React.ReactNode}
      </a>
    ),
  };
});

vi.mock("@/lib/hooks/use-copy", () => ({
  useCopy: () => ({ copy: mocks.copyFn }),
}));

vi.mock("sonner", () => ({
  Toaster: () => null,
  toast: {
    error: mocks.toastErrorFn,
    message: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

function createTestFile(name: string, type = "image/jpeg"): File {
  return new File(["test content"], name, { type });
}

async function setupValidS3Settings() {
  const store = getDefaultStore();
  store.set(settings.replaceProfile, {
    type: "apply-imported",
    value: {
      list: [["Default", getDefaultOptions()]],
      current: 0,
    },
  });
  store.set(settings.replaceProfile, {
    type: "apply-imported",
    value: {
      list: [
        [
          "Test Profile",
          produce(getDefaultOptions(), (draft) => {
            draft.s3.endpoint = "https://s3.example.com";
            draft.s3.bucket = "test-bucket";
            draft.s3.region = "us-east-1";
            draft.s3.accKeyId = "test-key";
            draft.s3.secretAccKey = "test-secret";
            draft.s3.pubUrl = "https://cdn.example.com";
          }),
        ],
      ],
      current: 0,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Upload Component", () => {
  describe("rendering", () => {
    it("should render dropzone with drag text", async () => {
      await setupValidS3Settings();
      const screen = await render(<Upload />);
      const dropzone = screen.getByText("Drag & Drop files here");
      await expect.element(dropzone).toBeInTheDocument();
    });

    it("should render file list title", async () => {
      await setupValidS3Settings();
      const screen = await render(<Upload />);
      const title = screen.getByText("Files to upload");
      await expect.element(title).toBeInTheDocument();
    });
  });

  describe("file list", () => {
    it("should display files after adding", async () => {
      await setupValidS3Settings();

      const screen = await render(
        <UploadHarness files={[createTestFile("test-image.jpg")]} />,
      );

      await expect
        .element(screen.getByText("test-image.jpg"))
        .toBeInTheDocument();
    });

    it("should show upload all button when files exist", async () => {
      await setupValidS3Settings();

      const screen = await render(
        <UploadHarness files={[createTestFile("test.jpg")]} />,
      );
      const uploadButton = screen.getByRole("button", { name: "Upload All" });
      await expect.element(uploadButton).toBeInTheDocument();
    });
  });

  describe("upload flow", () => {
    it("should upload file when individual upload button is clicked", async () => {
      await setupValidS3Settings();

      const screen = await render(
        <UploadHarness files={[createTestFile("test.jpg")]} />,
      );

      const uploadButton = screen
        .getByRole("button", { name: "Upload" })
        .first();
      await uploadButton.click();
      await expect.poll(() => mocks.putStoredImageFn).toHaveBeenCalledTimes(1);
    });

    it("keeps an obsolete put completion pending without integrating it", async () => {
      await setupValidS3Settings();
      const storedImage = createDeferred<
        | { ok: true; value: { key: string } }
        | { ok: false; error: { reason: "access-denied" } }
      >();
      const adapter = createMemoryImageStorageAdapter();
      const storePendingUpload = createStorePendingUpload({
        store: getDefaultStore(),
        createStorage: () => ({
          ...adapter,
          putStoredImage(input) {
            mocks.putStoredImageFn(input);
            return storedImage.promise;
          },
        }),
        onUploadFailed: vi.fn(),
      });
      const screen = await render(
        <UploadHarness
          files={[createTestFile("obsolete.jpg")]}
          effects={{
            processFile: mocks.processFileFn,
            storePendingUpload,
          }}
        />,
      );

      await screen.getByRole("button", { name: "Upload", exact: true }).click();
      await expect.poll(() => mocks.putStoredImageFn).toHaveBeenCalledTimes(1);
      const store = getDefaultStore();
      const current = store.get(settings.storage);
      store.set(settings.storage, {
        type: "update",
        value: {
          ...current.raw,
          secretAccKey: `${current.raw.secretAccKey}-rotated`,
        },
      });
      storedImage.resolve({
        ok: true,
        value: { key: "obsolete.jpg" },
      });

      await expect
        .element(screen.getByRole("button", { name: "Upload" }))
        .toBeInTheDocument();
      expect(mocks.putStoredImageFn).toHaveBeenCalledTimes(1);
      await expect
        .element(screen.getByRole("button", { name: "Clear Uploaded Entry" }))
        .not.toBeInTheDocument();
    });

    it("closes and disables editing as soon as uploading begins", async () => {
      await setupValidS3Settings();
      const stored = createDeferred<{
        status: "stored";
        image: { key: string };
      }>();
      const screen = await render(
        <UploadHarness
          files={[createTestFile("editing.jpg")]}
          effects={{
            processFile: mocks.processFileFn,
            storePendingUpload: () => stored.promise,
          }}
        />,
      );

      const edit = screen.getByRole("button", { name: "Edit" });
      await edit.click();
      await expect
        .element(screen.getByText("Key will be:"))
        .toBeInTheDocument();
      await screen.getByRole("button", { name: "Upload", exact: true }).click();

      await expect.element(edit).toBeDisabled();
      await expect
        .element(screen.getByText("Key will be:"))
        .not.toBeInTheDocument();

      stored.resolve({ status: "stored", image: { key: "editing.jpg" } });
    });
  });

  describe("file preview", () => {
    it("should show edit button for each file", async () => {
      await setupValidS3Settings();

      const screen = await render(
        <UploadHarness files={[createTestFile("test.jpg")]} />,
      );
      const editButton = screen.getByRole("button", { name: "Edit" }).first();
      await expect.element(editButton).toBeInTheDocument();
    });

    it("should show remove button for each file", async () => {
      await setupValidS3Settings();

      const screen = await render(
        <UploadHarness files={[createTestFile("test.jpg")]} />,
      );
      const removeButton = screen
        .getByRole("button", { name: "Remove" })
        .first();
      await expect.element(removeButton).toBeInTheDocument();
    });

    it("should remove file when remove button is clicked", async () => {
      await setupValidS3Settings();

      const screen = await render(
        <UploadHarness files={[createTestFile("test.jpg")]} />,
      );
      const removeButton = screen
        .getByRole("button", { name: "Remove" })
        .first();
      await removeButton.click();

      await expect.element(screen.getByText("(0)")).toBeInTheDocument();
    });

    it("copies through catalog safety and reports a changed target", async () => {
      await setupValidS3Settings();
      const adapter = createMemoryImageStorageAdapter();
      const storePendingUpload = createStorePendingUpload({
        store: getDefaultStore(),
        createStorage: () => adapter,
        onUploadFailed: vi.fn(),
      });
      const screen = await render(
        <UploadHarness
          files={[createTestFile("stored.jpg")]}
          effects={{
            processFile: mocks.processFileFn,
            storePendingUpload,
          }}
        />,
      );

      await screen.getByRole("button", { name: "Upload", exact: true }).click();
      await expect
        .element(screen.getByRole("button", { name: "Open menu" }))
        .toBeInTheDocument();
      await screen.getByRole("button", { name: "Open menu" }).click();
      await screen.getByRole("menuitem", { name: "Copy URL" }).click();
      await expect.poll(() => mocks.copyFn).toHaveBeenCalledTimes(1);
      expect(mocks.copyFn).toHaveBeenCalledWith(
        expect.stringContaining("https://cdn.example.com"),
        "Copy URL",
      );

      const store = getDefaultStore();
      const current = store.get(settings.storage);
      store.set(settings.storage, {
        type: "update",
        value: { ...current.raw, bucket: "different-bucket" },
      });
      await screen.getByRole("button", { name: "Open menu" }).click();
      await screen.getByRole("menuitem", { name: "Copy URL" }).click();
      await expect.poll(() => mocks.toastErrorFn).toHaveBeenCalledTimes(1);

      expect(mocks.copyFn).toHaveBeenCalledTimes(1);
      expect(mocks.toastErrorFn).toHaveBeenCalledWith(
        "Failed to copy Copy URL",
      );
    });
  });
});

function UploadHarness({
  files,
  effects = createUploadEffects(),
}: {
  files: File[];
  effects?: Partial<PendingUploadEffects>;
}) {
  return (
    <UploadQueueTestOwner effects={effects}>
      <AddFilesOnMount files={files} />
      <UploadContent />
    </UploadQueueTestOwner>
  );
}

function UploadQueueTestOwner({
  effects,
  children,
}: {
  effects: Partial<PendingUploadEffects>;
  children: React.ReactNode;
}) {
  const [queue] = useState(() => createUploadQueue(getDefaultStore(), effects));
  useLayoutEffect(() => queue.mount(), [queue]);
  return children;
}

function AddFilesOnMount({ files }: { files: File[] }) {
  const send = useSetAtom(uploadQueue);
  const uploadSettings = useAtomValue(settings.upload);
  useEffect(() => {
    send({
      type: "files.added",
      files,
      keyTemplate: uploadSettings?.keyTemplate,
      compressOption: uploadSettings?.compressionOption,
    });
  }, [
    files,
    send,
    uploadSettings?.compressionOption,
    uploadSettings?.keyTemplate,
  ]);
  return null;
}

function createUploadEffects(): Partial<PendingUploadEffects> {
  const adapter = createMemoryImageStorageAdapter();
  return {
    processFile: mocks.processFileFn,
    async storePendingUpload({ key, body }) {
      const input = {
        key,
        body,
        contentType: body.type || undefined,
      };
      mocks.putStoredImageFn(input);
      const result = await adapter.putStoredImage(input);
      return result.ok
        ? ({ status: "stored", image: result.value } as const)
        : ({ status: "failed", error: result.error } as const);
    },
  };
}
