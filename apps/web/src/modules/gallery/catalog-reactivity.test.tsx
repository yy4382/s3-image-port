import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { StrictMode } from "react";
import { IntlProvider } from "use-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/../messages/en.json";
import { imageCatalog } from "@/modules/image-catalog";
import { profileGenerationAtom } from "@/modules/settings/profile-generation";
import { settings } from "@/stores/atoms/settings";
import { createDeferred, settle } from "@/test/helpers/deterministic";
import { createRenderCounter } from "@/test/helpers/react";

import { PhotoItem } from "./GalleryContent/PhotoItem/PhotoItem";
import { PhotoGrid } from "./GalleryContent/PhotoGrid";
import { PhotoOptions } from "./GalleryContent/PhotoItem/photo-options";
import { GalleryControl } from "./GalleryControl/GalleryControl";
import PhotoModal from "../photo/PhotoModal";

const storage = vi.hoisted(() => ({
  images: [] as Array<{ key: string; lastModified?: string }>,
  create: vi.fn(),
  list: vi.fn(),
  probe: vi.fn(),
  delete: vi.fn(),
  rename: vi.fn(),
  download: vi.fn(),
  put: vi.fn(),
  checkAccess: vi.fn(),
}));

const route = vi.hoisted(() => ({
  search: {
    imagePath: "i/alpha.webp",
    galleryState: "{}",
  },
  navigate: vi.fn(),
  preload: vi.fn(),
}));

const feedback = vi.hoisted(() => ({
  copy: vi.fn(),
  error: vi.fn(),
  message: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}));

vi.mock(import("@/modules/image-storage"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    createS3ImageStorage(settings: unknown) {
      storage.create(settings);
      return {
        listStoredImages: () => storage.list(),
        probeStoredImage: (key: string) => storage.probe(key),
        deleteStoredImages: (keys: string[]) => storage.delete(keys),
        renameStoredImage: (input: unknown) => storage.rename(input),
        downloadStoredImage: (key: string) => storage.download(key),
        putStoredImage: (input: unknown) => storage.put(input),
        checkAccess: (input: unknown) => storage.checkAccess(input),
      };
    },
  };
});

vi.mock("@tanstack/react-router", () => ({
  getRouteApi: () => ({
    useNavigate: () => route.navigate,
    useSearch: () => route.search,
  }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useRouter: () => ({ preloadRoute: route.preload }),
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({ location: { state: { __TSR_key: "catalog-reactivity" } } }),
}));

vi.mock(import("@/modules/gallery/GalleryContent/PhotoItem/photo-img"), () => ({
  PhotoImg({
    s3Key,
    url,
    setLoadingState,
    className,
  }: {
    s3Key: string;
    url: string;
    setLoadingState: (state: "loading" | "loaded" | "error") => void;
    className?: string;
  }) {
    return (
      <img
        alt={s3Key}
        className={className}
        src={url}
        onError={() => setLoadingState("error")}
        onLoad={() => setLoadingState("loaded")}
      />
    );
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: feedback.error,
    message: feedback.message,
    success: feedback.success,
    warning: feedback.warning,
  },
}));

vi.mock("@/lib/hooks/use-copy", () => ({
  useCopy: () => ({ copy: feedback.copy, copyAsync: vi.fn() }),
}));

const alpha = {
  key: "i/alpha.webp",
  lastModified: "2026-07-01T10:00:00.000Z",
};
const beta = {
  key: "i/beta.webp",
  lastModified: "2026-07-02T10:00:00.000Z",
};
const firstTarget = {
  endpoint: "https://s3.example.com",
  bucket: "images",
  region: "us-east-1",
  accKeyId: "access-key",
  secretAccKey: "secret-key",
  forcePathStyle: false,
  pubUrl: "https://cdn.example.com",
  includePath: "gallery/",
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  route.search = { imagePath: alpha.key, galleryState: "{}" };
  storage.images = [alpha, beta];
  storage.list.mockImplementation(async () => ({
    ok: true,
    value: storage.images,
  }));
  storage.probe.mockResolvedValue({
    ok: true,
    value: { key: alpha.key, contentType: "image/webp" },
  });
  storage.delete.mockResolvedValue({
    ok: true,
    value: { deletedKeys: [alpha.key] },
  });
  storage.rename.mockResolvedValue({
    ok: true,
    value: { oldKey: alpha.key, newKey: "i/renamed.webp" },
  });
  storage.download.mockResolvedValue({
    ok: true,
    value: { key: alpha.key, body: new Blob(["image"]) },
  });
  storage.put.mockResolvedValue({ ok: true, value: alpha });
  storage.checkAccess.mockResolvedValue({
    ok: true,
    value: { allowedMethods: [] },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("catalog React reactivity", () => {
  it("renders a cached image while target-authorized actions wait for a refresh", async () => {
    localStorage.setItem("s3ip:gallery:photos", JSON.stringify([alpha]));
    const store = createStore();
    store.set(settings.storage, { type: "update", value: firstTarget });
    store.set(settings.gallery, { autoRefresh: false });

    const mounted = renderWithStore(
      store,
      <PhotoItem
        photo={alpha}
        size={{ width: 200, height: 100 }}
        position={{ x: 0, y: 0 }}
      />,
    );

    const image = await screen.findByAltText(alpha.key);
    expect(image).toHaveAttribute(
      "src",
      "https://cdn.example.com/i/alpha.webp",
    );
    fireEvent.load(image);
    expect(image).not.toHaveClass("invisible");
    expect(
      mounted.container.querySelector('[data-slot="skeleton"]'),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: `Open: ${alpha.key}` }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: `Select ${alpha.key}` }),
    ).not.toBeInTheDocument();
    expect(store.get(imageCatalog.item(alpha.key)).access).toBeUndefined();
    expect(storage.create).not.toHaveBeenCalled();
  });

  it("leaves native select-all alone in editable controls", async () => {
    const store = await catalogStore();
    renderWithStore(
      store,
      <>
        <input aria-label="Draft" />
        <PhotoGrid />
      </>,
    );

    expect(
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Draft" }), {
        key: "a",
        ctrlKey: true,
      }),
    ).toBe(true);
    expect(store.get(imageCatalog.view.selection).count).toBe(0);

    const handledElsewhere = new KeyboardEvent("keydown", {
      key: "a",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    handledElsewhere.preventDefault();
    window.dispatchEvent(handledElsewhere);
    expect(store.get(imageCatalog.view.selection).count).toBe(0);

    fireEvent.keyDown(window, { key: "a", ctrlKey: true });
    expect(store.get(imageCatalog.view.selection).keys).toEqual(
      new Set([alpha.key, beta.key]),
    );
  });

  it("hides a same-key replacement source until that source loads", async () => {
    const store = await catalogStore();
    renderWithStore(
      store,
      <PhotoItem
        photo={alpha}
        size={{ width: 200, height: 100 }}
        position={{ x: 0, y: 0 }}
      />,
    );

    fireEvent.load(screen.getByAltText(alpha.key));
    expect(
      screen.getByRole("button", { name: `Open: ${alpha.key}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: `Select ${alpha.key}` }),
    ).toBeInTheDocument();

    act(() => {
      store.set(settings.storage, {
        type: "update",
        value: { ...firstTarget, pubUrl: "https://second.example.com" },
      });
    });

    const replacement = screen.getByAltText(alpha.key);
    expect(replacement).toHaveAttribute(
      "src",
      "https://second.example.com/i/alpha.webp",
    );
    expect(replacement).toHaveClass("invisible");
    expect(
      screen.queryByRole("button", { name: `Open: ${alpha.key}` }),
    ).not.toBeInTheDocument();

    fireEvent.load(replacement);
    const open = screen.getByRole("button", { name: `Open: ${alpha.key}` });
    fireEvent.keyDown(open, { key: "Enter" });
    expect(route.navigate).toHaveBeenCalledWith({
      to: "/$locale/photo",
      params: { locale: "en" },
      search: {
        imagePath: alpha.key,
        galleryState: JSON.stringify(route.search),
      },
    });
  });

  it("joins StrictMode probes, follows capability changes, and ignores unmounted completion", async () => {
    const firstProbe = createDeferred<{
      ok: true;
      value: { key: string; contentType: string };
    }>();
    const secondProbe = createDeferred<{
      ok: true;
      value: { key: string; contentType: string };
    }>();
    storage.probe
      .mockImplementationOnce(() => firstProbe.promise)
      .mockImplementationOnce(() => secondProbe.promise);
    const store = await catalogStore();

    const mounted = renderWithStore(
      store,
      <StrictMode>
        <PhotoItem
          photo={alpha}
          size={{ width: 200, height: 100 }}
          position={{ x: 0, y: 0 }}
        />
      </StrictMode>,
    );
    fireEvent.error(screen.getByAltText(alpha.key));

    await waitFor(() => expect(storage.probe).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(storage.probe).toHaveBeenCalledTimes(1);

    act(() => {
      store.set(settings.storage, {
        type: "update",
        value: { ...firstTarget, region: "eu-west-1" },
      });
    });
    await waitFor(() => expect(storage.probe).toHaveBeenCalledTimes(2));

    act(() => {
      store.set(settings.storage, {
        type: "update",
        value: { ...firstTarget, bucket: "other-images" },
      });
    });
    expect(screen.getByAltText(alpha.key)).toHaveAttribute(
      "src",
      "https://cdn.example.com/i/alpha.webp",
    );
    expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();

    mounted.unmount();
    await settle();
    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) =>
      mutations.push(...records),
    );
    observer.observe(document.body, { childList: true, subtree: true });
    firstProbe.resolve({
      ok: true,
      value: { key: alpha.key, contentType: "image/webp" },
    });
    secondProbe.resolve({
      ok: true,
      value: { key: alpha.key, contentType: "image/avif" },
    });
    await settle();
    mutations.push(...observer.takeRecords());
    observer.disconnect();
    expect(storage.probe).toHaveBeenCalledTimes(2);
    expect(mutations).toEqual([]);
  });

  it("keeps a modal local to its key and disables actions on busy or mismatched access", async () => {
    const store = await catalogStore();
    const counter = createRenderCounter();
    renderWithStore(
      store,
      <counter.RenderCounter>
        <PhotoModal />
      </counter.RenderCounter>,
    );
    expect(screen.getByRole("button", { name: "Copy URL" })).toBeEnabled();
    const settledCommits = counter.commits;

    storage.images = [alpha, { ...beta, lastModified: "2026-07-03" }];
    act(() => {
      store.set(imageCatalog.integrate, {
        type: "upload-confirmed",
        uploadId: "beta-update",
        image: storage.images[1],
        generation: store.get(profileGenerationAtom),
        storageRevision: store.get(settings.storage).revision,
      });
    });
    await act(() => settle());
    expect(counter.commits).toBe(settledCommits);

    const deleting = createDeferred<{
      ok: false;
      error: { reason: "access-denied" };
    }>();
    storage.delete.mockImplementationOnce(() => deleting.promise);
    const deletion = store.set(imageCatalog.run, {
      type: "delete",
      keys: [alpha.key],
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copy URL" })).toBeDisabled(),
    );
    deleting.resolve({ ok: false, error: { reason: "access-denied" } });
    await act(() => deletion);

    act(() => {
      store.set(settings.storage, {
        type: "update",
        value: { ...firstTarget, bucket: "other-images" },
      });
    });
    expect(screen.getByAltText(alpha.key)).toHaveAttribute(
      "src",
      "https://cdn.example.com/i/alpha.webp",
    );
    expect(screen.getByRole("button", { name: "Copy URL" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "More actions" })).toBeDisabled();
  });

  it("returns from a rerendered modal with the exact search captured at open", async () => {
    route.search = {
      imagePath: alpha.key,
      galleryState: JSON.stringify({ searchTerm: "captured", pageSize: 50 }),
    };
    const store = await catalogStore();
    renderWithStore(store, <PhotoModal />);

    route.search = {
      imagePath: alpha.key,
      galleryState: JSON.stringify({ searchTerm: "later", pageSize: 100 }),
    };
    act(() => {
      store.set(imageCatalog.view.selection, {
        type: "toggle",
        key: alpha.key,
        checked: "toggle",
        shift: false,
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "Back to gallery" }));

    expect(route.navigate).toHaveBeenCalledOnce();
    expect(route.navigate).toHaveBeenCalledWith({
      to: "/$locale/gallery",
      params: { locale: "en" },
      search: { searchTerm: "captured", pageSize: 50 },
    });
  });

  it("returns on Escape with the exact search captured at open", async () => {
    route.search = {
      imagePath: alpha.key,
      galleryState: JSON.stringify({ searchTerm: "captured", pageSize: 50 }),
    };
    const store = await catalogStore();
    renderWithStore(store, <PhotoModal />);

    route.search = {
      imagePath: alpha.key,
      galleryState: JSON.stringify({ searchTerm: "later", pageSize: 100 }),
    };
    fireEvent.keyDown(window, { key: "Escape" });

    expect(route.navigate).toHaveBeenCalledOnce();
    expect(route.navigate).toHaveBeenCalledWith({
      to: "/$locale/gallery",
      params: { locale: "en" },
      search: { searchTerm: "captured", pageSize: 50 },
    });
  });

  it("returns after confirmed delete with the exact search captured at open", async () => {
    route.search = {
      imagePath: alpha.key,
      galleryState: JSON.stringify({ searchTerm: "captured", pageSize: 50 }),
    };
    const store = await catalogStore();
    renderWithStore(store, <PhotoModal />);

    route.search = {
      imagePath: alpha.key,
      galleryState: JSON.stringify({ searchTerm: "later", pageSize: 100 }),
    };
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(route.navigate).toHaveBeenCalledOnce());
    expect(route.navigate).toHaveBeenCalledWith({
      to: "/$locale/gallery",
      params: { locale: "en" },
      search: { searchTerm: "captured", pageSize: 50 },
    });
  });

  it("keeps the exact captured gallery search after confirmed rename", async () => {
    const galleryState = JSON.stringify({
      searchTerm: "captured",
      pageSize: 50,
    });
    route.search = { imagePath: alpha.key, galleryState };
    const store = await catalogStore();
    renderWithStore(store, <PhotoModal />);

    route.search = {
      imagePath: alpha.key,
      galleryState: JSON.stringify({ searchTerm: "later", pageSize: 100 }),
    };
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    await submitRename("i/renamed.webp");

    await waitFor(() => expect(route.navigate).toHaveBeenCalledOnce());
    expect(route.navigate).toHaveBeenCalledWith({
      to: "/$locale/photo",
      params: { locale: "en" },
      search: { imagePath: "i/renamed.webp", galleryState },
    });
  });

  it("keeps failed delete feedback local and never calls the success continuation", async () => {
    storage.delete.mockResolvedValueOnce({
      ok: false,
      error: { reason: "access-denied" },
    });
    const store = await catalogStore();
    const afterDelete = vi.fn();
    renderWithStore(
      store,
      <PhotoOptions
        photo={alpha}
        opened
        setOpened={() => {}}
        onAfterDelete={afterDelete}
      />,
    );

    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(feedback.error).toHaveBeenCalled());
    expect(afterDelete).not.toHaveBeenCalled();
    expect(route.navigate).not.toHaveBeenCalled();
  });

  it("does not publish action completion after the options unmount", async () => {
    const deleting = createDeferred<{
      ok: false;
      error: { reason: "access-denied" };
    }>();
    storage.delete.mockImplementationOnce(() => deleting.promise);
    const store = await catalogStore();
    const afterDelete = vi.fn();
    const mounted = renderWithStore(
      store,
      <PhotoOptions
        photo={alpha}
        opened
        setOpened={() => {}}
        onAfterDelete={afterDelete}
      />,
    );

    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(feedback.message).toHaveBeenCalledOnce();
    mounted.unmount();
    deleting.resolve({ ok: false, error: { reason: "access-denied" } });
    await settle();

    expect(feedback.error).not.toHaveBeenCalled();
    expect(afterDelete).not.toHaveBeenCalled();
  });

  it("does not publish stale delete feedback while the options stay mounted", async () => {
    const deleting = createDeferred<{
      ok: true;
      value: { deletedKeys: string[] };
    }>();
    storage.delete.mockImplementationOnce(() => deleting.promise);
    const store = await catalogStore();
    const afterDelete = vi.fn();
    renderWithStore(
      store,
      <PhotoOptions
        photo={alpha}
        opened
        setOpened={() => {}}
        onAfterDelete={afterDelete}
      />,
    );

    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(feedback.message).toHaveBeenCalledOnce();

    act(() => {
      store.set(settings.storage, {
        type: "update",
        value: { ...firstTarget, region: "eu-west-1" },
      });
    });
    deleting.resolve({ ok: true, value: { deletedKeys: [alpha.key] } });
    await settle();

    expect(feedback.error).not.toHaveBeenCalled();
    expect(feedback.success).not.toHaveBeenCalled();
    expect(afterDelete).not.toHaveBeenCalled();
  });

  it("does not publish stale rename feedback while the options stay mounted", async () => {
    const renaming = createDeferred<{
      ok: true;
      value: { oldKey: string; newKey: string };
    }>();
    storage.rename.mockImplementationOnce(() => renaming.promise);
    const store = await catalogStore();
    const afterRename = vi.fn();
    renderWithStore(
      store,
      <PhotoOptions
        photo={alpha}
        opened
        setOpened={() => {}}
        onAfterRename={afterRename}
      />,
    );

    fireEvent.click(await screen.findByRole("menuitem", { name: "Rename" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "i/renamed.webp" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Rename" }));
    expect(feedback.message).toHaveBeenCalledOnce();

    act(() => {
      store.set(settings.storage, {
        type: "update",
        value: { ...firstTarget, region: "eu-west-1" },
      });
    });
    renaming.resolve({
      ok: true,
      value: { oldKey: alpha.key, newKey: "i/renamed.webp" },
    });
    await settle();

    expect(feedback.error).not.toHaveBeenCalled();
    expect(feedback.success).not.toHaveBeenCalled();
    expect(feedback.warning).not.toHaveBeenCalled();
    expect(afterRename).not.toHaveBeenCalled();
  });

  it("publishes confirmed rename feedback and continuation", async () => {
    const store = await catalogStore();
    const afterRename = vi.fn();
    renderWithStore(
      store,
      <PhotoOptions
        photo={alpha}
        opened
        setOpened={() => {}}
        onAfterRename={afterRename}
      />,
    );

    await submitRename("i/renamed.webp");
    await waitFor(() => expect(afterRename).toHaveBeenCalledOnce());

    expect(storage.rename).toHaveBeenCalledWith({
      oldKey: alpha.key,
      newKey: "i/renamed.webp",
      overwrite: undefined,
    });
    expect(feedback.success).toHaveBeenCalledWith("Photo renamed successfully");
    expect(afterRename).toHaveBeenCalledWith("i/renamed.webp");
  });

  it.each([
    {
      name: "an existing destination",
      result: {
        ok: false as const,
        error: {
          reason: "already-exists" as const,
          key: "i/renamed.webp",
        },
      },
      channel: "error" as const,
      message:
        "An object with that name already exists. Choose a different name.",
    },
    {
      name: "a partial rename",
      result: {
        ok: false as const,
        error: {
          reason: "partial-rename" as const,
          copiedKey: "i/renamed.webp",
          failedDeleteKey: alpha.key,
        },
      },
      channel: "warning" as const,
      message:
        "Photo copied but failed to delete original. Both versions exist.",
    },
    {
      name: "an unknown failure",
      result: {
        ok: false as const,
        error: { reason: "unknown" as const, message: "rename failed" },
      },
      channel: "error" as const,
      message: "Failed to rename photo",
    },
  ])(
    "preserves rename feedback for $name",
    async ({ result, channel, message }) => {
      storage.rename.mockResolvedValueOnce(result);
      const store = await catalogStore();
      const afterRename = vi.fn();
      renderWithStore(
        store,
        <PhotoOptions
          photo={alpha}
          opened
          setOpened={() => {}}
          onAfterRename={afterRename}
        />,
      );

      await submitRename("i/renamed.webp");
      await waitFor(() =>
        expect(feedback[channel]).toHaveBeenCalledWith(message),
      );

      expect(afterRename).not.toHaveBeenCalled();
    },
  );

  it("rejects empty and unchanged rename keys before storage IO", async () => {
    const store = await catalogStore();
    renderWithStore(
      store,
      <PhotoOptions photo={alpha} opened setOpened={() => {}} />,
    );

    await submitRename(alpha.key);
    expect(feedback.error).toHaveBeenCalledWith(
      "New name is the same as the current name",
    );
    expect(storage.rename).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "   " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Rename" }));

    expect(feedback.error).toHaveBeenCalledWith("Please enter a valid name");
    expect(storage.rename).not.toHaveBeenCalled();
  });

  it("does not publish stale download feedback while the options stay mounted", async () => {
    const downloading = createDeferred<{
      ok: true;
      value: { key: string; body: Blob };
    }>();
    storage.download.mockImplementationOnce(() => downloading.promise);
    const store = await catalogStore();
    renderWithStore(
      store,
      <PhotoOptions photo={alpha} opened setOpened={() => {}} />,
    );

    fireEvent.click(await screen.findByRole("menuitem", { name: "Download" }));
    act(() => {
      store.set(settings.storage, {
        type: "update",
        value: { ...firstTarget, region: "eu-west-1" },
      });
    });
    downloading.resolve({
      ok: true,
      value: { key: alpha.key, body: new Blob(["image"]) },
    });
    await settle();

    expect(feedback.error).not.toHaveBeenCalled();
    expect(feedback.success).not.toHaveBeenCalled();
  });

  it("downloads a stored image through the browser boundary", async () => {
    const body = new Blob(["image"], { type: "image/webp" });
    storage.download.mockResolvedValueOnce({
      ok: true,
      value: { key: alpha.key, body },
    });
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:stored-image");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL");
    const clickAnchor = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const store = await catalogStore();
    renderWithStore(
      store,
      <PhotoOptions photo={alpha} opened setOpened={() => {}} />,
    );

    fireEvent.click(await screen.findByRole("menuitem", { name: "Download" }));
    await waitFor(() => expect(clickAnchor).toHaveBeenCalledOnce());

    expect(storage.download).toHaveBeenCalledWith(alpha.key);
    expect(createObjectUrl).toHaveBeenCalledWith(body);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:stored-image");
    expect(feedback.success).toHaveBeenCalledWith("Download started");
  });

  it("publishes a real browser download failure", async () => {
    storage.download.mockResolvedValueOnce({
      ok: false,
      error: { reason: "access-denied" },
    });
    const store = await catalogStore();
    renderWithStore(
      store,
      <PhotoOptions photo={alpha} opened setOpened={() => {}} />,
    );

    fireEvent.click(await screen.findByRole("menuitem", { name: "Download" }));
    await waitFor(() =>
      expect(feedback.error).toHaveBeenCalledWith("Failed to download photo"),
    );

    expect(feedback.success).not.toHaveBeenCalled();
  });

  it.each(["alpha-first", "beta-first"] as const)(
    "settles disjoint deletes through the public catalog boundary: %s",
    async (order) => {
      const deletingAlpha = createDeferred<{
        ok: true;
        value: { deletedKeys: string[] };
      }>();
      const deletingBeta = createDeferred<{
        ok: true;
        value: { deletedKeys: string[] };
      }>();
      storage.delete.mockImplementation((keys: string[]) =>
        keys.includes(alpha.key) ? deletingAlpha.promise : deletingBeta.promise,
      );
      const store = await catalogStore();
      const alphaItem = imageCatalog.item(alpha.key);
      const betaItem = imageCatalog.item(beta.key);

      const alphaDeletion = store.set(imageCatalog.run, {
        type: "delete",
        keys: [alpha.key],
      });
      const betaDeletion = store.set(imageCatalog.run, {
        type: "delete",
        keys: [beta.key],
      });
      expect(store.get(alphaItem).reserved).toBe(true);
      expect(store.get(betaItem).reserved).toBe(true);

      if (order === "alpha-first") {
        storage.images = [beta];
        deletingAlpha.resolve({
          ok: true,
          value: { deletedKeys: [alpha.key] },
        });
        await alphaDeletion;
        storage.images = [];
        deletingBeta.resolve({
          ok: true,
          value: { deletedKeys: [beta.key] },
        });
        await betaDeletion;
      } else {
        storage.images = [alpha];
        deletingBeta.resolve({
          ok: true,
          value: { deletedKeys: [beta.key] },
        });
        await betaDeletion;
        storage.images = [];
        deletingAlpha.resolve({
          ok: true,
          value: { deletedKeys: [alpha.key] },
        });
        await alphaDeletion;
      }
      await settle();

      expect(storage.delete).toHaveBeenCalledTimes(2);
      expect(store.get(imageCatalog.state).projection.images).toEqual([]);
      expect(store.get(alphaItem).reserved).toBe(false);
      expect(store.get(betaItem).reserved).toBe(false);
    },
  );

  it("does not publish stale selected-delete feedback while gallery controls stay mounted", async () => {
    const deleting = createDeferred<{
      ok: true;
      value: { deletedKeys: string[] };
    }>();
    storage.delete.mockImplementationOnce(() => deleting.promise);
    const store = await catalogStore();
    store.set(imageCatalog.view.selection, {
      type: "toggle",
      key: alpha.key,
      checked: true,
      shift: false,
    });
    renderWithStore(store, <GalleryControl />);

    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(feedback.message).toHaveBeenCalledOnce();

    act(() => {
      store.set(settings.storage, {
        type: "update",
        value: { ...firstTarget, region: "eu-west-1" },
      });
    });
    deleting.resolve({ ok: true, value: { deletedKeys: [alpha.key] } });
    await settle();

    expect(feedback.error).not.toHaveBeenCalled();
    expect(feedback.success).not.toHaveBeenCalled();
  });

  it("does not publish stale delete feedback or navigate while the modal stays mounted", async () => {
    const deleting = createDeferred<{
      ok: true;
      value: { deletedKeys: string[] };
    }>();
    storage.delete.mockImplementationOnce(() => deleting.promise);
    const store = await catalogStore();
    renderWithStore(store, <PhotoModal />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(feedback.message).toHaveBeenCalledOnce();

    act(() => {
      store.set(settings.storage, {
        type: "update",
        value: { ...firstTarget, region: "eu-west-1" },
      });
    });
    deleting.resolve({ ok: true, value: { deletedKeys: [alpha.key] } });
    await settle();

    expect(feedback.error).not.toHaveBeenCalled();
    expect(feedback.success).not.toHaveBeenCalled();
    expect(route.navigate).not.toHaveBeenCalled();
  });

  it("navigates away from the modal only after a confirmed delete", async () => {
    const store = await catalogStore();
    renderWithStore(store, <PhotoModal />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(route.navigate).toHaveBeenCalledOnce());
    expect(feedback.success).toHaveBeenCalledWith("Deleted photos");
  });
});

async function catalogStore() {
  const store = createStore();
  store.set(settings.storage, { type: "update", value: firstTarget });
  await store.set(imageCatalog.run, {
    type: "refresh",
    intent: "foreground",
    reason: "manual",
  });
  return store;
}

function renderWithStore(
  store: ReturnType<typeof createStore>,
  node: React.ReactNode,
) {
  return render(
    <IntlProvider locale="en" messages={en}>
      <Provider store={store}>{node}</Provider>
    </IntlProvider>,
  );
}

async function submitRename(newKey: string) {
  fireEvent.click(await screen.findByRole("menuitem", { name: "Rename" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByRole("textbox"), {
    target: { value: newKey },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Rename" }));
}
