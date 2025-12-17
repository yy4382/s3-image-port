import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/../test/utils/render-browser";
import { renderHook } from "vitest-browser-react";
import { useAtom, useSetAtom } from "jotai";
import { Upload } from "./upload";
import { fileListAtom, appendFilesAtom } from "./atoms/upload-atoms";
import { profilesAtom } from "@/stores/atoms/settings";
import { getDefaultOptions } from "@/stores/schemas/settings";
import { produce } from "immer";
import type ImageS3Client from "@/lib/s3/image-s3-client";

const mocks = vi.hoisted(() => {
  return {
    uploadFn: vi.fn().mockResolvedValue({ $metadata: { httpStatusCode: 200 } }),
    processFileFn: vi.fn().mockImplementation((file: File) => {
      return Promise.resolve(file);
    }),
  };
});

vi.mock(import("@/lib/s3/image-s3-client"), () => {
  return {
    default: class MockImageS3Client {
      upload = mocks.uploadFn;
    } as unknown as typeof ImageS3Client,
  };
});

vi.mock(import("@/lib/utils/imageCompress"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    processFile: mocks.processFileFn,
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

async function clearFileList() {
  const { result } = await renderHook(() => useAtom(fileListAtom));
  result.current[1]([]);
}

beforeEach(async () => {
  vi.clearAllMocks();
  localStorage.clear();
  await clearFileList();
});

describe("Upload Component", () => {
  describe("rendering", () => {
    it("should render dropzone with drag text", async () => {
      await setupValidS3Settings();
      const screen = await render(<Upload />);
      // Using exact text from the translation
      const dropzone = screen.getByText("Drag & Drop files here");
      await expect.element(dropzone).toBeInTheDocument();
    });

    it("should render file list title", async () => {
      await setupValidS3Settings();
      const screen = await render(<Upload />);
      // The title contains "Files to upload"
      const title = screen.getByText("Files to upload");
      await expect.element(title).toBeInTheDocument();
    });
  });

  describe("file list", () => {
    it("should display files after adding", async () => {
      await setupValidS3Settings();

      // Add a file via the atom
      const { result: appendResult } = await renderHook(() =>
        useSetAtom(appendFilesAtom),
      );
      appendResult.current([createTestFile("test-image.jpg")]);

      const screen = await render(<Upload />);
      await expect
        .element(screen.getByText("test-image.jpg"))
        .toBeInTheDocument();
    });

    it("should show upload all button when files exist", async () => {
      await setupValidS3Settings();

      const { result: appendResult } = await renderHook(() =>
        useSetAtom(appendFilesAtom),
      );
      appendResult.current([createTestFile("test.jpg")]);

      const screen = await render(<Upload />);
      const uploadButton = screen.getByRole("button", { name: "Upload All" });
      await expect.element(uploadButton).toBeInTheDocument();
    });
  });

  describe("upload flow", () => {
    it("should upload file when individual upload button is clicked", async () => {
      await setupValidS3Settings();

      const { result: appendResult } = await renderHook(() =>
        useSetAtom(appendFilesAtom),
      );
      appendResult.current([createTestFile("test.jpg")]);

      const screen = await render(<Upload />);

      // Click individual upload button (use first() to get the first non-Upload All button)
      const uploadButton = screen
        .getByRole("button", { name: "Upload" })
        .first();
      await uploadButton.click();

      // Wait for upload to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mocks.uploadFn).toHaveBeenCalled();
    });
  });

  describe("file preview", () => {
    it("should show edit button for each file", async () => {
      await setupValidS3Settings();

      const { result: appendResult } = await renderHook(() =>
        useSetAtom(appendFilesAtom),
      );
      appendResult.current([createTestFile("test.jpg")]);

      const screen = await render(<Upload />);
      const editButton = screen.getByRole("button", { name: "Edit" }).first();
      await expect.element(editButton).toBeInTheDocument();
    });

    it("should show remove button for each file", async () => {
      await setupValidS3Settings();

      const { result: appendResult } = await renderHook(() =>
        useSetAtom(appendFilesAtom),
      );
      appendResult.current([createTestFile("test.jpg")]);

      const screen = await render(<Upload />);
      const removeButton = screen
        .getByRole("button", { name: "Remove" })
        .first();
      await expect.element(removeButton).toBeInTheDocument();
    });

    it("should remove file when remove button is clicked", async () => {
      await setupValidS3Settings();

      const { result: appendResult } = await renderHook(() =>
        useSetAtom(appendFilesAtom),
      );
      appendResult.current([createTestFile("test.jpg")]);

      const screen = await render(<Upload />);
      const removeButton = screen
        .getByRole("button", { name: "Remove" })
        .first();
      await removeButton.click();

      // The file should be removed - count should be 0
      await expect.element(screen.getByText("(0)")).toBeInTheDocument();
    });
  });
});
