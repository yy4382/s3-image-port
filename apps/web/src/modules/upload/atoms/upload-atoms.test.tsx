/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook } from "vitest-browser-react";
import { Provider, useAtom, useAtomValue, useSetAtom } from "jotai";
import { createStore } from "jotai";
import type { PendingUpload } from "../types";
import type ImageS3Client from "@/lib/s3/image-s3-client";

const mocks = vi.hoisted(() => {
  return {
    uploadFn: vi.fn().mockResolvedValue({ $metadata: { httpStatusCode: 200 } }),
    processFileFn: vi.fn().mockImplementation((file: File) => {
      const processed = new File([file], `processed-${file.name}`, {
        type: file.type,
      });
      return Promise.resolve(processed);
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
} from "./upload-atoms";
import type { S3Options } from "@/stores/schemas/settings";

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

      await act(async () => {
        await result.current.upload(fileAtom, mockS3Settings);
      });

      expect(result.current.fileList[0].status).toBe("uploaded");
      expect(mocks.uploadFn).toHaveBeenCalledWith(
        expect.any(File),
        "test/test.jpg",
      );
    });

    test("processes file before upload if compressOption is set", async () => {
      const store = createStore();
      const testFile: PendingUpload = {
        file: createTestFile("test.jpg"),
        processedFile: null,
        key: { toString: () => "test/test.jpg", template: "" } as any,
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
      expect(result.current.fileList[0].status).toBe("uploaded");
    });

    test("handles upload errors and resets status", async () => {
      mocks.uploadFn.mockRejectedValueOnce(new Error("Upload failed"));

      const store = createStore();
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

      await act(async () => {
        await result.current.upload(fileAtom, mockS3Settings);
      });

      expect(result.current.fileList[0].status).toBe("pending");
    });
  });

  describe("uploadAllFilesAtom", () => {
    test("uploads all files", async () => {
      const store = createStore();
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
      expect(mocks.uploadFn).toHaveBeenCalledTimes(2);
    });
  });
});
