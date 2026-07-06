/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook } from "vitest-browser-react";
import { Provider, useAtom, useAtomValue, useSetAtom } from "jotai";
import { createStore } from "jotai";
import type { PendingUpload } from "../types";
import { S3KeyMetadata } from "@/lib/s3/s3-key";
import {
  type ImageStorage,
  type PutStoredImageInput,
} from "@/modules/image-storage";
import { createMemoryImageStorageAdapter } from "@/modules/image-storage/adapters/memory";

const mocks = vi.hoisted(() => {
  return {
    putStoredImageFn: vi.fn(),
    processFileFn: vi.fn().mockImplementation((file: File) => {
      const processed = new File([file], `processed-${file.name}`, {
        type: file.type,
      });
      return Promise.resolve(processed);
    }),
  };
});

vi.mock(import("@/lib/utils/imageCompress"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    processFile: mocks.processFileFn,
  };
});

vi.mock(import("sonner"), () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  } as unknown as any,
}));

import {
  fileListAtom,
  appendFilesAtom,
  clearUploadedFilesAtom,
  fileAtomAtoms,
  processFileAtom,
  uploadFileAtom,
  uploadAllFilesAtom,
  uploadStorageAtom,
} from "./upload-atoms";
import type { S3Options } from "@/stores/schemas/settings";
import { galleryDirtyStatusAtom } from "@/stores/atoms/gallery";

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

function createTestFile(name: string, type = "image/jpeg"): File {
  return new File(["test content"], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.putStoredImageFn.mockResolvedValue(undefined);
  localStorage.clear();
});

describe("upload-atoms", () => {
  describe("fileListAtom", () => {
    test("initial state is empty array", async () => {
      const { result } = await renderHook(() => useAtomValue(fileListAtom), {
        wrapper: Provider,
      });
      expect(result.current).toEqual([]);
    });
  });

  describe("appendFilesAtom", () => {
    test("adds files to fileListAtom", async () => {
      const { result, act } = await renderHook(
        () => ({
          fileList: useAtomValue(fileListAtom),
          appendFiles: useSetAtom(appendFilesAtom),
        }),
        { wrapper: Provider },
      );

      const files = [createTestFile("test1.jpg"), createTestFile("test2.png")];

      await act(() => {
        result.current.appendFiles(files);
      });

      expect(result.current.fileList).toHaveLength(2);
      expect(result.current.fileList[0].file.name).toBe("test1.jpg");
      expect(result.current.fileList[1].file.name).toBe("test2.png");
    });

    test("sets initial status to pending", async () => {
      const { result, act } = await renderHook(
        () => ({
          fileList: useAtomValue(fileListAtom),
          appendFiles: useSetAtom(appendFilesAtom),
        }),
        { wrapper: Provider },
      );

      await act(() => {
        result.current.appendFiles([createTestFile("test.jpg")]);
      });

      expect(result.current.fileList[0].status).toBe("pending");
    });

    test("generates unique IDs for each file", async () => {
      const { result, act } = await renderHook(
        () => ({
          fileList: useAtomValue(fileListAtom),
          appendFiles: useSetAtom(appendFilesAtom),
        }),
        { wrapper: Provider },
      );

      await act(() => {
        result.current.appendFiles([
          createTestFile("test1.jpg"),
          createTestFile("test2.jpg"),
        ]);
      });

      const ids = result.current.fileList.map((f) => f.id);
      expect(new Set(ids).size).toBe(2);
    });

    test("generates S3KeyMetadata for each file", async () => {
      const { result, act } = await renderHook(
        () => ({
          fileList: useAtomValue(fileListAtom),
          appendFiles: useSetAtom(appendFilesAtom),
        }),
        { wrapper: Provider },
      );

      await act(() => {
        result.current.appendFiles([createTestFile("test.jpg")]);
      });

      expect(result.current.fileList[0].key).toBeDefined();
      expect(result.current.fileList[0].key.toString()).toContain("jpg");
    });
  });

  describe("clearUploadedFilesAtom", () => {
    test("read returns true when uploaded files exist", async () => {
      const store = createStore();
      store.set(fileListAtom, [
        {
          file: createTestFile("test.jpg"),
          processedFile: null,
          key: { toString: () => "test.jpg" } as any,
          compressOption: null,
          status: "uploaded",
          id: "1",
          supportProcess: true,
        },
      ]);

      const { result } = await renderHook(
        () => useAtom(clearUploadedFilesAtom),
        {
          wrapper: ({ children }) => (
            <Provider store={store}>{children}</Provider>
          ),
        },
      );

      expect(result.current[0]).toBe(true);
    });

    test("read returns false when no uploaded files", async () => {
      const store = createStore();
      store.set(fileListAtom, [
        {
          file: createTestFile("test.jpg"),
          processedFile: null,
          key: { toString: () => "test.jpg" } as any,
          compressOption: null,
          status: "pending",
          id: "1",
          supportProcess: true,
        },
      ]);

      const { result } = await renderHook(
        () => useAtom(clearUploadedFilesAtom),
        {
          wrapper: ({ children }) => (
            <Provider store={store}>{children}</Provider>
          ),
        },
      );

      expect(result.current[0]).toBe(false);
    });

    test("write removes only uploaded files", async () => {
      const store = createStore();
      store.set(fileListAtom, [
        {
          file: createTestFile("pending.jpg"),
          processedFile: null,
          key: { toString: () => "pending.jpg" } as any,
          compressOption: null,
          status: "pending",
          id: "1",
          supportProcess: true,
        },
        {
          file: createTestFile("uploaded.jpg"),
          processedFile: null,
          key: { toString: () => "uploaded.jpg" } as any,
          compressOption: null,
          status: "uploaded",
          id: "2",
          supportProcess: true,
        },
      ]);

      const { result, act } = await renderHook(
        () => ({
          clearUploaded: useAtom(clearUploadedFilesAtom),
          fileList: useAtomValue(fileListAtom),
        }),
        {
          wrapper: ({ children }) => (
            <Provider store={store}>{children}</Provider>
          ),
        },
      );

      await act(() => {
        result.current.clearUploaded[1]();
      });

      expect(result.current.fileList).toHaveLength(1);
      expect(result.current.fileList[0].file.name).toBe("pending.jpg");
    });
  });

  describe("processFileAtom", () => {
    test("sets status to processing then processed", async () => {
      const store = createStore();
      const testFile: PendingUpload = {
        file: createTestFile("test.jpg"),
        processedFile: null,
        key: { toString: () => "test.jpg", template: "" } as any,
        compressOption: { maxSize: 1024 } as any,
        status: "pending",
        id: "1",
        supportProcess: true,
      };
      store.set(fileListAtom, [testFile]);

      const { result, act } = await renderHook(
        () => ({
          fileAtoms: useAtomValue(fileAtomAtoms),
          process: useSetAtom(processFileAtom),
          fileList: useAtomValue(fileListAtom),
        }),
        {
          wrapper: ({ children }) => (
            <Provider store={store}>{children}</Provider>
          ),
        },
      );

      const fileAtom = result.current.fileAtoms[0];

      await act(async () => {
        await result.current.process(fileAtom);
      });

      expect(result.current.fileList[0].status).toBe("processed");
      expect(result.current.fileList[0].processedFile).not.toBeNull();
    });

    test("skips processing if no compressOption", async () => {
      const store = createStore();
      const testFile: PendingUpload = {
        file: createTestFile("test.jpg"),
        processedFile: null,
        key: { toString: () => "test.jpg", template: "" } as any,
        compressOption: null,
        status: "pending",
        id: "1",
        supportProcess: true,
      };
      store.set(fileListAtom, [testFile]);

      const { result, act } = await renderHook(
        () => ({
          fileAtoms: useAtomValue(fileAtomAtoms),
          process: useSetAtom(processFileAtom),
          fileList: useAtomValue(fileListAtom),
        }),
        {
          wrapper: ({ children }) => (
            <Provider store={store}>{children}</Provider>
          ),
        },
      );

      const fileAtom = result.current.fileAtoms[0];

      await act(async () => {
        await result.current.process(fileAtom);
      });

      expect(result.current.fileList[0].status).toBe("pending");
      expect(mocks.processFileFn).not.toHaveBeenCalled();
    });

    test("handles processing errors gracefully", async () => {
      mocks.processFileFn.mockRejectedValueOnce(new Error("Processing failed"));

      const store = createStore();
      const testFile: PendingUpload = {
        file: createTestFile("test.jpg"),
        processedFile: null,
        key: { toString: () => "test.jpg", template: "" } as any,
        compressOption: { maxSize: 1024 } as any,
        status: "pending",
        id: "1",
        supportProcess: true,
      };
      store.set(fileListAtom, [testFile]);

      const { result, act } = await renderHook(
        () => ({
          fileAtoms: useAtomValue(fileAtomAtoms),
          process: useSetAtom(processFileAtom),
          fileList: useAtomValue(fileListAtom),
        }),
        {
          wrapper: ({ children }) => (
            <Provider store={store}>{children}</Provider>
          ),
        },
      );

      const fileAtom = result.current.fileAtoms[0];

      await act(async () => {
        try {
          await result.current.process(fileAtom);
        } catch {
          // Expected error
        }
      });

      expect(result.current.fileList[0].status).toBe("pending");
    });
  });

  describe("uploadFileAtom", () => {
    test("uploads file and sets status to uploaded", async () => {
      const store = createStore();
      const storage = createRecordingStorage();
      store.set(uploadStorageAtom, {
        createStorage: () => storage,
      });
      const testFile: PendingUpload = {
        file: createTestFile("test.jpg"),
        processedFile: null,
        key: { toString: () => "test/test.jpg", template: "" } as any,
        compressOption: null,
        status: "pending",
        id: "1",
        supportProcess: true,
      };
      store.set(fileListAtom, [testFile]);

      const { result, act } = await renderHook(
        () => ({
          fileAtoms: useAtomValue(fileAtomAtoms),
          upload: useSetAtom(uploadFileAtom),
          fileList: useAtomValue(fileListAtom),
          galleryDirty: useAtomValue(galleryDirtyStatusAtom),
        }),
        {
          wrapper: ({ children }) => (
            <Provider store={store}>{children}</Provider>
          ),
        },
      );

      const fileAtom = result.current.fileAtoms[0];

      await act(async () => {
        await result.current.upload(fileAtom, mockS3Settings);
      });

      expect(result.current.fileList[0].status).toBe("uploaded");
      expect(mocks.putStoredImageFn).toHaveBeenCalledWith({
        key: "test/test.jpg",
        body: expect.any(File),
        contentType: "image/jpeg",
      });
      expect(result.current.galleryDirty).toBe(true);
    });

    test("processes file before upload if compressOption is set", async () => {
      const store = createStore();
      const storage = createRecordingStorage();
      store.set(uploadStorageAtom, {
        createStorage: () => storage,
      });
      const file = createTestFile("test.jpg");
      const testFile: PendingUpload = {
        file,
        processedFile: null,
        key: S3KeyMetadata.create(
          file,
          "{{filename}}.{{ext}}",
          () => "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        ),
        compressOption: { maxSize: 1024 } as any,
        status: "pending",
        id: "1",
        supportProcess: true,
      };
      store.set(fileListAtom, [testFile]);

      const { result, act } = await renderHook(
        () => ({
          fileAtoms: useAtomValue(fileAtomAtoms),
          upload: useSetAtom(uploadFileAtom),
          fileList: useAtomValue(fileListAtom),
        }),
        {
          wrapper: ({ children }) => (
            <Provider store={store}>{children}</Provider>
          ),
        },
      );

      const fileAtom = result.current.fileAtoms[0];

      await act(async () => {
        await result.current.upload(fileAtom, mockS3Settings);
      });

      expect(mocks.processFileFn).toHaveBeenCalled();
      expect(mocks.putStoredImageFn).toHaveBeenCalledWith({
        key: "processed-test.jpg.jpg",
        body: expect.any(File),
        contentType: "image/jpeg",
      });
      expect(mocks.putStoredImageFn.mock.calls[0][0].body.name).toBe(
        "processed-test.jpg",
      );
      expect(result.current.fileList[0].status).toBe("uploaded");
    });

    test("handles upload errors and resets status", async () => {
      const store = createStore();
      const storage = createFailingUploadStorage();
      store.set(uploadStorageAtom, {
        createStorage: () => storage,
      });
      const testFile: PendingUpload = {
        file: createTestFile("test.jpg"),
        processedFile: null,
        key: { toString: () => "test/test.jpg", template: "" } as any,
        compressOption: null,
        status: "pending",
        id: "1",
        supportProcess: true,
      };
      store.set(fileListAtom, [testFile]);

      const { result, act } = await renderHook(
        () => ({
          fileAtoms: useAtomValue(fileAtomAtoms),
          upload: useSetAtom(uploadFileAtom),
          fileList: useAtomValue(fileListAtom),
        }),
        {
          wrapper: ({ children }) => (
            <Provider store={store}>{children}</Provider>
          ),
        },
      );

      const fileAtom = result.current.fileAtoms[0];

      let uploadResult: Awaited<ReturnType<(typeof result.current)["upload"]>>;
      await act(async () => {
        uploadResult = await result.current.upload(fileAtom, mockS3Settings);
      });

      expect(uploadResult!).toEqual({
        success: false,
        error: "access-denied",
      });
      expect(result.current.fileList[0].status).toBe("pending");
    });
  });

  describe("uploadAllFilesAtom", () => {
    test("uploads all files", async () => {
      const store = createStore();
      const storage = createRecordingStorage();
      store.set(uploadStorageAtom, {
        createStorage: () => storage,
      });
      store.set(fileListAtom, [
        {
          file: createTestFile("test1.jpg"),
          processedFile: null,
          key: { toString: () => "test/test1.jpg", template: "" } as any,
          compressOption: null,
          status: "pending",
          id: "1",
          supportProcess: true,
        },
        {
          file: createTestFile("test2.jpg"),
          processedFile: null,
          key: { toString: () => "test/test2.jpg", template: "" } as any,
          compressOption: null,
          status: "pending",
          id: "2",
          supportProcess: true,
        },
      ]);

      const { result, act } = await renderHook(
        () => ({
          uploadAll: useSetAtom(uploadAllFilesAtom),
          fileList: useAtomValue(fileListAtom),
        }),
        {
          wrapper: ({ children }) => (
            <Provider store={store}>{children}</Provider>
          ),
        },
      );

      await act(async () => {
        await result.current.uploadAll(mockS3Settings);
      });

      expect(result.current.fileList[0].status).toBe("uploaded");
      expect(result.current.fileList[1].status).toBe("uploaded");
      expect(mocks.putStoredImageFn).toHaveBeenCalledTimes(2);
    });
  });
});

function createRecordingStorage(): ImageStorage {
  const adapter = createMemoryImageStorageAdapter({
    publicBaseUrl: "https://cdn.example.com",
  });
  return {
    ...adapter,
    async putStoredImage(input: PutStoredImageInput) {
      mocks.putStoredImageFn(input);
      return adapter.putStoredImage(input);
    },
  };
}

function createFailingUploadStorage(): ImageStorage {
  const storage = createRecordingStorage();
  return {
    ...storage,
    async putStoredImage(input) {
      mocks.putStoredImageFn(input);
      return { ok: false, error: { reason: "access-denied" } };
    },
  };
}
