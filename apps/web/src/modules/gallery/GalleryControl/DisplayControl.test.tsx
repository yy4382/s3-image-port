import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createStore, Provider } from "jotai";
import {
  StrictMode,
  useLayoutEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { IntlProvider } from "use-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/../messages/en.json";
import { imageCatalog } from "@/modules/image-catalog";
import { settle } from "@/test/helpers/deterministic";

import { DisplayControl } from "./DisplayControl";

const route = vi.hoisted(() => {
  let search: Record<string, unknown> = {};
  let navigationId: number | undefined;
  let locationSequence = 0;
  let locationKey = "location-0";
  const listeners = new Set<() => void>();
  return {
    navigate: vi.fn(),
    get search() {
      return search;
    },
    reset(next: Record<string, unknown>) {
      search = next;
      navigationId = undefined;
      locationKey = `location-${++locationSequence}`;
      listeners.clear();
    },
    commit(
      next: Record<string, unknown>,
      nextNavigationId?: number,
      nextLocationKey?: string,
    ) {
      search = next;
      navigationId = nextNavigationId;
      locationKey = nextLocationKey ?? `location-${++locationSequence}`;
      for (const listener of listeners) listener();
    },
    get navigationId() {
      return navigationId;
    },
    get locationKey() {
      return locationKey;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});

const storage = vi.hoisted(() => ({ create: vi.fn() }));
const workflow = vi.hoisted(() => ({
  moduleLoaded: vi.fn(),
}));

vi.mock("@/modules/upload/upload-queue", () => {
  workflow.moduleLoaded();
  return {};
});

vi.mock("@tanstack/react-router", () => ({
  getRouteApi: () => ({
    useNavigate: () => route.navigate,
    useSearch: () =>
      useSyncExternalStore(
        route.subscribe,
        () => route.search,
        () => route.search,
      ),
  }),
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    useSyncExternalStore(
      route.subscribe,
      () =>
        select({
          location: {
            state: {
              __TSR_key: route.locationKey,
              galleryDisplayNavigationId: route.navigationId,
            },
          },
        }),
      () =>
        select({
          location: {
            state: {
              __TSR_key: route.locationKey,
              galleryDisplayNavigationId: route.navigationId,
            },
          },
        }),
    ),
}));

vi.mock(import("@/modules/image-storage"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    createS3ImageStorage(settings: unknown) {
      storage.create(settings);
      throw new Error("URL synchronization must not construct storage");
    },
  };
});

beforeEach(() => {
  route.reset({});
  route.navigate.mockReset();
  storage.create.mockReset();
  workflow.moduleLoaded.mockReset();
  localStorage.clear();
});

describe("gallery URL edge", () => {
  it("hydrates a canonical direct load without writes or navigation", async () => {
    const store = createStore();
    const counts = observeView(store);
    const persistedWrites = vi.spyOn(Storage.prototype, "setItem");
    let commits = 0;
    renderControl(store, () => commits++);

    await settle();

    expect(counts()).toEqual({ filter: 0, page: 0, pageSize: 0 });
    expect(route.navigate).not.toHaveBeenCalled();
    expect(storage.create).not.toHaveBeenCalled();
    expect(persistedWrites).not.toHaveBeenCalled();
    expect(workflow.moduleLoaded).not.toHaveBeenCalled();

    const settled = { commits, view: counts() };
    await settle({ microtasks: 10 });
    expect({ commits, view: counts() }).toEqual(settled);
    expect(route.navigate).not.toHaveBeenCalled();
    expect(persistedWrites).not.toHaveBeenCalled();
    persistedWrites.mockRestore();
  });

  it("normalizes an explicit default search with one replace", async () => {
    route.reset({ pageSize: 20, searchTerm: "" });
    const store = createStore();
    renderControl(store);

    await waitFor(() => expect(route.navigate).toHaveBeenCalledOnce());
    expect(route.navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ".",
        search: {},
        replace: true,
      }),
    );

    act(() => route.commit({}, navigationId(0)));
    await settle();
    expect(route.navigate).toHaveBeenCalledOnce();
    expect(storage.create).not.toHaveBeenCalled();
  });

  it("treats reordered canonical keys as the same direct-load route", async () => {
    route.reset({ sortOrder: "asc", searchTerm: "cats" });
    const store = createStore();
    renderControl(store);

    await waitFor(() =>
      expect(store.get(imageCatalog.view.filter)).toMatchObject({
        searchTerm: "cats",
        sortOrder: "asc",
      }),
    );
    await settle();

    expect(route.navigate).not.toHaveBeenCalled();
    expect(storage.create).not.toHaveBeenCalled();
  });

  it("pushes one user edit and does not echo its acknowledgement", async () => {
    const store = createStore();
    store.set(imageCatalog.view.page, 3);
    renderControl(store);
    await settle();
    route.navigate.mockClear();

    fireEvent.change(screen.getByPlaceholderText("Search by image name..."), {
      target: { value: "cats" },
    });

    await waitFor(() => expect(route.navigate).toHaveBeenCalledOnce());
    expect(route.navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ".",
        search: { searchTerm: "cats" },
      }),
    );
    expect(store.get(imageCatalog.view.page)).toBe(1);

    act(() => route.commit({ searchTerm: "cats" }, navigationId(0)));
    await settle();
    expect(route.navigate).toHaveBeenCalledOnce();
    expect(storage.create).not.toHaveBeenCalled();
  });

  it("keeps repeated stale acknowledgements inert until an external location makes back authoritative", async () => {
    const store = createStore();
    const counts = observeView(store);
    renderControl(store);
    await settle();

    fireEvent.change(screen.getByPlaceholderText("Search by image name..."), {
      target: { value: "pending" },
    });
    await waitFor(() => expect(route.navigate).toHaveBeenCalledOnce());

    act(() => route.commit({ prefix: "external/" }));
    await waitFor(() =>
      expect(store.get(imageCatalog.view.filter)).toMatchObject({
        searchTerm: "",
        prefix: "external/",
      }),
    );
    const afterExternal = counts();

    const staleNavigationId = navigationId(0);
    act(() =>
      route.commit({ searchTerm: "pending" }, staleNavigationId, "stale-A"),
    );
    await settle();
    expect(store.get(imageCatalog.view.filter)).toMatchObject({
      searchTerm: "",
      prefix: "external/",
    });
    expect(counts()).toEqual(afterExternal);
    expect(route.navigate).toHaveBeenCalledOnce();

    act(() =>
      route.commit({ searchTerm: "pending" }, staleNavigationId, "stale-A"),
    );
    await settle();
    expect(store.get(imageCatalog.view.filter)).toMatchObject({
      searchTerm: "",
      prefix: "external/",
    });
    expect(counts()).toEqual(afterExternal);

    act(() => route.commit({ sortOrder: "asc" }, undefined, "external-C"));
    await waitFor(() =>
      expect(store.get(imageCatalog.view.filter).sortOrder).toBe("asc"),
    );

    act(() =>
      route.commit({ searchTerm: "pending" }, staleNavigationId, "stale-A"),
    );
    await waitFor(() =>
      expect(store.get(imageCatalog.view.filter).searchTerm).toBe("pending"),
    );
    expect(store.get(imageCatalog.view.filter).prefix).toBeUndefined();

    expect(route.navigate).toHaveBeenCalledOnce();
    expect(storage.create).not.toHaveBeenCalled();
  });

  it("hydrates distinct back/forward commits once and ignores search-key order", async () => {
    const store = createStore();
    const counts = observeView(store);
    renderControl(store);
    await settle();

    act(() => {
      store.set(imageCatalog.view.selection, {
        type: "toggle",
        key: "i/selected.webp",
        checked: "toggle",
        shift: false,
      });
    });

    act(() => route.commit({ searchTerm: "cats", sortOrder: "asc" }));
    await waitFor(() =>
      expect(store.get(imageCatalog.view.filter)).toMatchObject({
        searchTerm: "cats",
        sortOrder: "asc",
      }),
    );
    const afterFirst = counts();

    act(() => route.commit({ sortOrder: "asc", searchTerm: "cats" }));
    await settle();
    expect(counts()).toEqual(afterFirst);

    act(() => route.commit({ searchTerm: "dogs" }));
    await waitFor(() =>
      expect(store.get(imageCatalog.view.filter).searchTerm).toBe("dogs"),
    );
    act(() => route.commit({ searchTerm: "cats", sortOrder: "asc" }));
    await waitFor(() =>
      expect(store.get(imageCatalog.view.filter).searchTerm).toBe("cats"),
    );

    expect(store.get(imageCatalog.view.selection).keys).toEqual(
      new Set(["i/selected.webp"]),
    );
    expect(route.navigate).not.toHaveBeenCalled();
    expect(storage.create).not.toHaveBeenCalled();
  });

  it("settles two rapid external commits at the newest semantic state", async () => {
    const store = createStore();
    renderControl(store);
    await settle();

    act(() => {
      route.commit({ searchTerm: "older" });
      route.commit({ searchTerm: "newer", pageSize: 50 });
    });

    await waitFor(() => {
      expect(store.get(imageCatalog.view.filter).searchTerm).toBe("newer");
      expect(store.get(imageCatalog.view.pageSize)).toBe(50);
    });
    const settled = {
      filter: store.get(imageCatalog.view.filter),
      pageSize: store.get(imageCatalog.view.pageSize),
      navigation: route.navigate.mock.calls.length,
    };
    await settle();
    expect(store.get(imageCatalog.view.filter)).toBe(settled.filter);
    expect(store.get(imageCatalog.view.pageSize)).toBe(settled.pageSize);
    expect(route.navigate).toHaveBeenCalledTimes(settled.navigation);
    expect(route.navigate).not.toHaveBeenCalled();
    expect(storage.create).not.toHaveBeenCalled();
  });
});

function renderControl(
  store: ReturnType<typeof createStore>,
  onCommit?: () => void,
) {
  function CommitCounter() {
    useLayoutEffect(() => {
      onCommit?.();
    });
    return null;
  }
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <StrictMode>
        <Provider store={store}>
          <IntlProvider locale="en" messages={en}>
            <CommitCounter />
            {children}
          </IntlProvider>
        </Provider>
      </StrictMode>
    );
  }
  return render(<DisplayControl />, { wrapper: Wrapper });
}

function observeView(store: ReturnType<typeof createStore>) {
  const value = { filter: 0, page: 0, pageSize: 0 };
  const unsubscribes = [
    store.sub(imageCatalog.view.filter, () => value.filter++),
    store.sub(imageCatalog.view.page, () => value.page++),
    store.sub(imageCatalog.view.pageSize, () => value.pageSize++),
  ];
  return () => {
    void unsubscribes;
    return { ...value };
  };
}

function navigationId(call: number) {
  const state = route.navigate.mock.calls[call]?.[0]?.state;
  return state?.({}).galleryDisplayNavigationId as number;
}
