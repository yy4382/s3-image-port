// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { createStore, Provider, useAtomValue } from "jotai";
import { selectAtom } from "jotai/utils";
import {
  StrictMode,
  Suspense,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";
import { renderToString } from "react-dom/server";
import { createActor } from "xstate";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDeferred, settle } from "@/test/helpers/deterministic";
import { imageCatalog } from "@/modules/image-catalog";
import { settings } from "@/stores/atoms/settings";

import { createUploadQueue, uploadQueue } from "./upload-queue";
import {
  selectHasUploaded,
  selectUploadActors,
  uploadQueueMachine,
} from "./machines/upload-queue-machine";
import {
  selectPendingUpload,
  type PendingUploadEffects,
} from "./machines/pending-upload-machine";

afterEach(async () => {
  cleanup();
  await settle();
});

function makeActor(effects: Partial<PendingUploadEffects> = {}) {
  return createActor(uploadQueueMachine, {
    input: {
      effects: {
        processFile: async (file) => file,
        storePendingUpload: async ({ key }) => ({
          status: "stored",
          image: { key },
        }),
        onProcessingFailed: vi.fn(),
        ...effects,
      },
    },
  });
}

function createQueue(
  ownership: "caller" | "queue" = "queue",
  effects: Partial<PendingUploadEffects> = {},
) {
  const store = createStore();
  const actor = makeActor(effects);
  const queue = createUploadQueue(store, {}, { actor, ownership });
  return { store, actor, queue };
}

function Owner({ mount }: { mount: () => () => void }) {
  useLayoutEffect(mount, [mount]);
  return null;
}

function addFile(store: ReturnType<typeof createStore>, name = "local.webp") {
  store.set(uploadQueue, {
    type: "files.added",
    files: [new File(["image"], name, { type: "image/webp" })],
    keyTemplate: undefined,
    compressOption: null,
  });
  return store.get(uploadQueue).uploads.at(-1)!;
}

describe("root upload queue ownership", () => {
  it("performs no write, subscription, start, or IO during SSR or abandoned render", () => {
    for (const mode of ["server", "suspended"] as const) {
      const store = createStore();
      const set = vi.spyOn(store, "set");
      const actor = makeActor();
      const start = vi.spyOn(actor, "start");
      const subscribe = vi.spyOn(actor, "subscribe");
      const queue = createUploadQueue(
        store,
        {},
        {
          actor,
          ownership: "queue",
        },
      );
      expect(set).not.toHaveBeenCalled();

      if (mode === "server") {
        expect(
          renderToString(
            <Provider store={store}>
              <Owner mount={queue.mount} />
            </Provider>,
          ),
        ).toBe("");
      } else {
        const never = new Promise(() => {});
        function Abandoned() {
          throw never;
          return null;
        }
        const view = render(
          <Provider store={store}>
            <Suspense fallback={<span>fallback</span>}>
              <Owner mount={queue.mount} />
              <Abandoned />
            </Suspense>
          </Provider>,
        );
        expect(view.getByText("fallback")).toBeInTheDocument();
      }

      expect(set).not.toHaveBeenCalled();
      expect(start).not.toHaveBeenCalled();
      expect(subscribe).not.toHaveBeenCalled();
    }
  });

  it("starts once through StrictMode and stops owned actor and child once", async () => {
    const { store, actor, queue } = createQueue("queue");
    const start = vi.spyOn(actor, "start");
    const stop = vi.spyOn(actor, "stop");
    const view = render(
      <StrictMode>
        <Provider store={store}>
          <Owner mount={queue.mount} />
        </Provider>
      </StrictMode>,
    );
    await settle();
    const child = addFile(store);

    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
    view.unmount();
    await settle();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(child.getSnapshot().status).toBe("stopped");
  });

  it("never stops an actor retained by its caller", async () => {
    const { store, actor, queue } = createQueue("caller");
    const stop = vi.spyOn(actor, "stop");
    const view = render(
      <Provider store={store}>
        <Owner mount={queue.mount} />
      </Provider>,
    );
    await settle();
    view.unmount();
    await settle();
    expect(stop).not.toHaveBeenCalled();
    expect(actor.getSnapshot().status).toBe("active");
    actor.stop();
  });

  it("isolates actors and snapshots between Jotai stores", async () => {
    const first = createQueue();
    const second = createQueue();
    const view = render(
      <>
        <Provider store={first.store}>
          <Owner mount={first.queue.mount} />
        </Provider>
        <Provider store={second.store}>
          <Owner mount={second.queue.mount} />
        </Provider>
      </>,
    );
    await settle();
    const child = addFile(first.store, "first.webp");

    expect(first.store.get(uploadQueue).uploads).toEqual([child]);
    expect(second.store.get(uploadQueue).uploads).toEqual([]);
    expect(first.actor).not.toBe(second.actor);
    view.unmount();
    await settle();
  });

  it("preserves in-flight processing and PUT across route unmount", async () => {
    const processed = createDeferred<File>();
    const stored = createDeferred<{
      status: "stored";
      image: { key: string };
    }>();
    const processFile = vi.fn(() => processed.promise);
    const storePendingUpload = vi.fn(() => stored.promise);
    const { store, actor, queue } = createQueue("queue", {
      processFile,
      storePendingUpload,
    });
    function Route() {
      useAtomValue(uploadQueue);
      return null;
    }
    function App({ route }: { route: boolean }) {
      return (
        <Provider store={store}>
          <Owner mount={queue.mount} />
          {route && <Route />}
        </Provider>
      );
    }
    const view = render(<App route />);
    await settle();
    store.set(uploadQueue, {
      type: "files.added",
      files: [new File(["image"], "kept.webp", { type: "image/webp" })],
      keyTemplate: undefined,
      compressOption: { type: "jpeg", quality: 80 },
    });
    const child = store.get(uploadQueue).uploads[0];
    child.send({ type: "upload.requested" });
    await settle();
    expect(processFile).toHaveBeenCalledTimes(1);

    view.rerender(<App route={false} />);
    processed.resolve(
      new File(["processed"], "kept.jpg", { type: "image/jpeg" }),
    );
    await settle();
    expect(storePendingUpload).toHaveBeenCalledTimes(1);
    view.rerender(<App route />);
    stored.resolve({ status: "stored", image: { key: "kept.jpg" } });
    await settle();

    expect(store.get(uploadQueue).uploads[0]).toBe(child);
    expect(processFile).toHaveBeenCalledTimes(1);
    expect(storePendingUpload).toHaveBeenCalledTimes(1);
    expect(selectHasUploaded(actor.getSnapshot())).toBe(true);
    view.unmount();
    await settle();
  });

  it("does not notify aggregate controls for a child-only transition", async () => {
    const { store, actor, queue } = createQueue("caller");
    const aggregateAtom = selectAtom(
      uploadQueue,
      ({ uploads, hasUploaded }) => ({ uploads, hasUploaded }),
      (left, right) =>
        left.uploads === right.uploads &&
        left.hasUploaded === right.hasUploaded,
    );
    const release = queue.mount();
    const notifications = vi.fn();
    const unsubscribe = store.sub(aggregateAtom, notifications);
    const child = addFile(store);
    notifications.mockClear();
    child.send({ type: "template.updated", template: "changed/{name}" });
    await settle();

    expect(notifications).not.toHaveBeenCalled();
    unsubscribe();
    release();
    await settle();
    actor.stop();
  });

  it("keeps one preview subscription local to its child", async () => {
    const { store, actor, queue } = createQueue("caller");
    const release = queue.mount();
    addFile(store, "a.webp");
    await settle();
    addFile(store, "b.webp");
    await settle();
    const [first, second] = selectUploadActors(actor.getSnapshot());
    const firstSubscribe = vi.spyOn(first, "subscribe");
    const firstRenders = vi.fn();
    const secondRenders = vi.fn();
    const aggregateRenders = vi.fn();
    function Preview({
      upload,
      rendered,
    }: {
      upload: typeof first;
      rendered: () => void;
    }) {
      const snapshot = useSyncExternalStore(
        (listener) => {
          const subscription = upload.subscribe(listener);
          return () => subscription.unsubscribe();
        },
        () => upload.getSnapshot(),
        () => upload.getSnapshot(),
      );
      selectPendingUpload(snapshot);
      rendered();
      return null;
    }
    function Aggregate() {
      useAtomValue(uploadQueue);
      aggregateRenders();
      return null;
    }
    render(
      <Provider store={store}>
        <Aggregate />
        <Preview upload={first} rendered={firstRenders} />
        <Preview upload={second} rendered={secondRenders} />
      </Provider>,
    );
    firstRenders.mockClear();
    secondRenders.mockClear();
    aggregateRenders.mockClear();
    second.send({ type: "template.updated", template: "changed/{name}" });
    await settle();

    expect(firstSubscribe).toHaveBeenCalledTimes(1);
    expect(firstRenders).not.toHaveBeenCalled();
    expect(secondRenders).toHaveBeenCalledTimes(1);
    expect(aggregateRenders).not.toHaveBeenCalled();

    firstRenders.mockClear();
    secondRenders.mockClear();
    aggregateRenders.mockClear();
    store.set(settings.gallery, (gallery) => ({
      ...gallery,
      autoRefresh: !gallery.autoRefresh,
    }));
    store.set(imageCatalog.view.filter, (filter) => ({
      ...filter,
      searchTerm: "unrelated catalog change",
    }));
    await settle();

    expect(firstRenders).not.toHaveBeenCalled();
    expect(secondRenders).not.toHaveBeenCalled();
    expect(aggregateRenders).not.toHaveBeenCalled();
    release();
    await settle();
    actor.stop();
  });
});
