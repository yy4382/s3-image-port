import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/../test/utils/render-browser";
import { renderHook } from "vitest-browser-react";
import { useAtom } from "jotai";
import { useEffect } from "react";

import {
  type ImageStorage,
  type PutStoredImageInput,
} from "@/modules/image-storage";
import { createMemoryImageStorageAdapter } from "@/modules/image-storage/adapters/memory";
import { profilesAtom } from "@/stores/atoms/settings";
import { getDefaultOptions } from "@/stores/schemas/settings";
import { produce } from "immer";

import { Upload, UploadContent } from "./upload";
import {
  UploadQueueProvider,
  useAddFilesToUploadQueue,
} from "./upload-queue-context";
import type { UploadQueueEffects } from "./machines/upload-queue-machine";

const mocks = vi.hoisted(() => {
  return {
    putStoredImageFn: vi.fn(),
    processFileFn: vi.fn().mockImplementation((file: File) => {
      return Promise.resolve(file);
    }),
    onUploadSucceededFn: vi.fn(),
  };
});

vi.mock(import("@tanstack/react-router"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    ClientOnly: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

function createTestFile(name: string, type = "image/jpeg"): File {
  return new File(["test content"], name, { type });
}

async function setupValidS3Settings() {
  const { result } = await renderHook(() => useAtom(profilesAtom));
  result.current[1]({
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
      const screen = await render(<Upload effects={createUploadEffects()} />);
      const dropzone = screen.getByText("Drag & Drop files here");
      await expect.element(dropzone).toBeInTheDocument();
    });

    it("should render file list title", async () => {
      await setupValidS3Settings();
      const screen = await render(<Upload effects={createUploadEffects()} />);
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

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mocks.putStoredImageFn).toHaveBeenCalled();
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
  });
});

function UploadHarness({ files }: { files: File[] }) {
  return (
    <UploadQueueProvider effects={createUploadEffects()}>
      <AddFilesOnMount files={files} />
      <UploadContent />
    </UploadQueueProvider>
  );
}

function AddFilesOnMount({ files }: { files: File[] }) {
  const addFiles = useAddFilesToUploadQueue();
  useEffect(() => {
    addFiles(files);
  }, [addFiles, files]);
  return null;
}

function createUploadEffects(): Partial<UploadQueueEffects> {
  const adapter = createMemoryImageStorageAdapter();
  const storage: ImageStorage = {
    ...adapter,
    async putStoredImage(input: PutStoredImageInput) {
      mocks.putStoredImageFn(input);
      return adapter.putStoredImage(input);
    },
  };
  return {
    processFile: mocks.processFileFn,
    createStorage: () => storage,
    onUploadSucceeded: mocks.onUploadSucceededFn,
  };
}
