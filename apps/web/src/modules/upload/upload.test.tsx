import { page, userEvent } from "vitest/browser";
import { IntlProvider } from "use-intl";
import en from "@/../messages/en.json";
import zh from "@/../messages/zh.json";
import type { PendingUploadResult } from "./types";
import { uploadReceipt } from "@/test/helpers/upload";
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
      const title = screen.getByText("Upload queue");
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
      const uploadButton = screen.getByRole("button", {
        name: "Upload pending (1)",
      });
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

    it("keeps an obsolete PUT success uploaded without integrating it", async () => {
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
        .element(screen.getByText("Uploaded to previous configuration"))
        .toBeInTheDocument();
      expect(mocks.putStoredImageFn).toHaveBeenCalledTimes(1);
      await expect
        .element(screen.getByRole("button", { name: "Clear uploaded" }))
        .toBeInTheDocument();
      await expect
        .element(screen.getByRole("button", { name: "Retry", exact: true }))
        .not.toBeInTheDocument();
    });

    it("closes and disables editing as soon as uploading begins", async () => {
      await setupValidS3Settings();
      const stored = createDeferred<{
        status: "stored";
        image: { key: string };
        receipt: typeof uploadReceipt;
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

      stored.resolve({
        status: "stored",
        image: { key: "editing.jpg" },
        receipt: uploadReceipt,
      });
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

    it("copies the actual uploaded key and public URL after editing the template and changing targets", async () => {
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
        .element(screen.getByRole("button", { name: "Copy" }))
        .toBeInTheDocument();
      await screen.getByRole("button", { name: "Copy" }).click();
      await screen.getByRole("menuitem", { name: "Copy URL" }).click();
      await expect.poll(() => mocks.copyFn).toHaveBeenCalledTimes(1);
      expect(mocks.copyFn).toHaveBeenCalledWith(
        expect.stringContaining("https://cdn.example.com"),
        "Copy URL",
      );

      const firstUrl = mocks.copyFn.mock.calls[0][0];
      const store = getDefaultStore();
      const child = store.get(uploadQueue).uploads[0];
      child.send({
        type: "template.updated",
        template: "changed/{{filename}}.{{ext}}",
      });
      const current = store.get(settings.storage);
      store.set(settings.storage, {
        type: "update",
        value: {
          ...current.raw,
          bucket: "different-bucket",
          pubUrl: "https://different.example.com",
        },
      });
      await screen.getByRole("button", { name: "Copy" }).click();
      await screen.getByRole("menuitem", { name: "Copy URL" }).click();
      await expect.poll(() => mocks.copyFn).toHaveBeenCalledTimes(2);
      expect(mocks.copyFn.mock.calls[1][0]).toBe(firstUrl);
      await screen.getByRole("button", { name: "Copy", exact: true }).click();
      await screen.getByRole("menuitem", { name: "Copy Markdown" }).click();
      const actualKey = firstUrl.replace("https://cdn.example.com/", "");
      expect(mocks.copyFn.mock.calls[2][0]).toBe(
        `![${actualKey}](${firstUrl})`,
      );
      expect(mocks.toastErrorFn).not.toHaveBeenCalled();
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
        ? ({
            status: "stored",
            image: result.value,
            receipt: uploadReceipt,
          } as const)
        : ({ status: "failed", error: result.error } as const);
    },
  };
}

describe("upload recovery interface", () => {
  it("shows 8 successes and 2 failures, then retries only the two failed PUTs", async () => {
    await setupValidS3Settings();
    const request = vi.fn<PendingUploadEffects["storePendingUpload"]>(
      async ({ file, key }) =>
        Number(file.name[0]) < 8
          ? { status: "stored", image: { key }, receipt: uploadReceipt }
          : {
              status: "failed",
              error: {
                reason: "access-denied",
                details: { code: "AccessDenied", httpStatus: 403 },
              },
            },
    );
    const screen = await render(
      <UploadHarness
        files={Array.from({ length: 10 }, (_, i) => createTestFile(`${i}.jpg`))}
        effects={{ storePendingUpload: request }}
      />,
    );
    await screen
      .getByRole("button", { name: "Upload pending (10)", exact: true })
      .click();
    await expect
      .element(screen.getByText("Uploaded: 8", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Failed: 2", { exact: true }))
      .toBeInTheDocument();
    expect(
      screen
        .getByText(
          "The storage bucket denied the upload. Check write permissions and S3 settings.",
        )
        .elements(),
    ).toHaveLength(2);
    expect(request).toHaveBeenCalledTimes(10);
    const originalKeys = request.mock.calls
      .slice(8)
      .map(([input]) => input.key);
    request.mockImplementation(async ({ key }) => ({
      status: "stored",
      image: { key },
      receipt: uploadReceipt,
    }));
    await screen
      .getByRole("button", { name: "Retry failed (2)", exact: true })
      .click();
    await expect
      .element(screen.getByText("Uploaded: 10", { exact: true }))
      .toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(12);
    expect(request.mock.calls.slice(10).map(([input]) => input.key)).toEqual(
      originalKeys,
    );
    await expect
      .element(screen.getByRole("button", { name: "Retry failed (2)" }))
      .not.toBeInTheDocument();
  });

  it("keeps failure details when leaving the route and clears them at retry start", async () => {
    await setupValidS3Settings();
    const request = vi.fn<PendingUploadEffects["storePendingUpload"]>(
      async () => ({ status: "failed", error: { reason: "access-denied" } }),
    );
    const files = [createTestFile("kept.jpg")];
    const screen = await render(
      <UploadQueueTestOwner effects={{ storePendingUpload: request }}>
        <AddFilesOnMount files={files} />
        <RouteToggle />
      </UploadQueueTestOwner>,
    );
    await screen.getByRole("button", { name: "Upload", exact: true }).click();
    await expect
      .element(screen.getByText("Upload failed", { exact: true }))
      .toBeInTheDocument();
    await screen.getByRole("button", { name: "Toggle upload page" }).click();
    await expect.element(screen.getByText("kept.jpg")).not.toBeInTheDocument();
    await screen.getByRole("button", { name: "Toggle upload page" }).click();
    await expect
      .element(screen.getByText("Upload failed", { exact: true }))
      .toBeInTheDocument();
    const next = createDeferred<PendingUploadResult>();
    request.mockImplementation(() => next.promise);
    await screen.getByRole("button", { name: "Retry", exact: true }).click();
    await expect
      .element(screen.getByText("Upload failed", { exact: true }))
      .not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
    next.resolve({
      status: "failed",
      error: {
        reason: "unknown",
        message: "secret",
        details: { code: "NoSuchBucket", httpStatus: 404 },
      },
    });
    await expect
      .element(
        screen.getByText(
          "The storage bucket was not found. Check the bucket name in S3 settings.",
        ),
      )
      .toBeInTheDocument();
    expect(document.body.textContent).not.toContain("secret");
  });

  it("keeps processing failure visible and retries processing before PUT", async () => {
    await setupValidS3Settings();
    const processing = vi
      .fn<PendingUploadEffects["processFile"]>()
      .mockRejectedValueOnce(new Error("secret decode failure"));
    const upload = vi.fn<PendingUploadEffects["storePendingUpload"]>(
      async ({ key }) => ({
        status: "stored",
        image: { key },
        receipt: uploadReceipt,
      }),
    );
    const screen = await render(
      <UploadHarness
        files={[createTestFile("process.jpg")]}
        effects={{ processFile: processing, storePendingUpload: upload }}
      />,
    );
    const child = getDefaultStore().get(uploadQueue).uploads[0];
    child.send({
      type: "compression.updated",
      option: { type: "webp", quality: 60 },
    });
    await screen.getByRole("button", { name: "Upload", exact: true }).click();
    await expect
      .element(screen.getByText("Processing failed", { exact: true }))
      .toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
    processing.mockResolvedValueOnce(
      new File(["processed"], "process.webp", { type: "image/webp" }),
    );
    await screen.getByRole("button", { name: "Retry", exact: true }).click();
    await expect
      .element(screen.getByText("Uploaded", { exact: true }))
      .toBeInTheDocument();
    expect(processing).toHaveBeenCalledTimes(2);
    expect(processing.mock.calls[1][0]).toBe(processing.mock.calls[0][0]);
    expect(processing.mock.calls[1][1]).toEqual({ type: "webp", quality: 60 });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][0].body.type).toBe("image/webp");
    expect(mocks.toastErrorFn).not.toHaveBeenCalled();
  });

  it.each(["en", "zh"] as const)(
    "keeps %s results and keyboard details usable at 320px, with unknown results excluded from bulk actions",
    async (locale) => {
      await setupValidS3Settings();
      await page.viewport(320, 1600);
      const messages = locale === "en" ? en : zh;
      const t = messages.upload.fileList;
      const request = vi.fn<PendingUploadEffects["storePendingUpload"]>(
        async ({ file, key }) => {
          if (file.name.startsWith("failed"))
            return {
              status: "failed",
              error: {
                reason: "access-denied",
                details: { code: "AccessDenied", httpStatus: 403 },
              },
            };
          if (file.name.startsWith("unknown"))
            return {
              status: "unconfirmed",
              error: {
                reason: "unknown",
                message: "SECRET_SIGNATURE",
                cause: { authorization: "SECRET_CREDENTIAL" },
              },
            };
          return {
            status: "stored-unreconciled",
            image: { key },
            receipt: uploadReceipt,
          };
        },
      );
      try {
        const screen = await render(
          <IntlProvider locale={locale} messages={messages}>
            <UploadHarness
              files={[
                "failed-long-file-name.jpg",
                "unknown-long-file-name.jpg",
                "stored-long-file-name.jpg",
              ].map((name) => createTestFile(name))}
              effects={{ storePendingUpload: request }}
            />
          </IntlProvider>,
        );
        await screen
          .getByRole("button", {
            name: t.uploadAll.replace("{count}", "3"),
            exact: true,
          })
          .click();
        await expect
          .element(screen.getByText(t.unconfirmed, { exact: true }))
          .toBeInTheDocument();
        const unknown = screen
          .getByText("unknown-long-file-name.jpg")
          .element()
          .closest('[data-slot="card"]')!;
        const summary = unknown.querySelector("summary")!;
        summary.focus();
        await userEvent.keyboard("{Enter}");
        await expect
          .element(screen.getByText(t.unconfirmedDetails))
          .toBeVisible();
        expect(document.body.textContent).not.toMatch(
          /SECRET_SIGNATURE|SECRET_CREDENTIAL/,
        );
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
        for (const element of document.querySelectorAll("button, summary")) {
          const rect = element.getBoundingClientRect();
          expect(rect.right).toBeLessThanOrEqual(320);
          expect(rect.left).toBeGreaterThanOrEqual(0);
        }
        await page
          .elementLocator(document.querySelector(".container")!)
          .screenshot({ path: `/tmp/s3-128-${locale}-320.png` });
        const store = getDefaultStore();
        store.set(uploadQueue, {
          type: "files.added",
          files: [createTestFile("new.jpg")],
          keyTemplate: "{{filename}}.{{ext}}",
          compressOption: null,
        });
        await screen
          .getByRole("button", {
            name: t.uploadAll.replace("{count}", "1"),
            exact: true,
          })
          .click();
        await expect.poll(() => request).toHaveBeenCalledTimes(4);
        await screen
          .getByRole("button", {
            name: t.retryFailed.replace("{count}", "1"),
            exact: true,
          })
          .click();
        await expect.poll(() => request).toHaveBeenCalledTimes(5);
        expect(
          request.mock.calls.filter(([input]) =>
            input.file.name.startsWith("unknown"),
          ),
        ).toHaveLength(1);
        await page
          .elementLocator(unknown)
          .getByRole("button", { name: t.retry, exact: true })
          .click();
        await expect.poll(() => request).toHaveBeenCalledTimes(6);
        expect(request.mock.calls[5][0].key).toBe(request.mock.calls[1][0].key);
      } finally {
        await page.viewport(1280, 720);
      }
    },
  );
});

function RouteToggle() {
  const [visible, setVisible] = useState(true);
  return (
    <>
      <button onClick={() => setVisible((value) => !value)}>
        Toggle upload page
      </button>
      {visible && <UploadContent />}
    </>
  );
}
