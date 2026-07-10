// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { atom, createStore, Provider, useAtomValue } from "jotai";
import { atomWithActor, atomWithActorSnapshot } from "jotai-xstate";
import { StrictMode, Suspense, useLayoutEffect } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assign, createActor, fromCallback, setup } from "xstate";

afterEach(cleanup);

function createObservedLogic(events: string[]) {
  return fromCallback(() => {
    events.push("started");
    return () => events.push("stopped");
  });
}

describe("jotai-xstate 0.6.1 lifecycle contract", () => {
  it("starts an auto-start actor during the first vanilla read", () => {
    const events: string[] = [];
    const actorAtom = atomWithActor(createObservedLogic(events));
    const store = createStore();

    expect(events).toEqual([]);
    store.get(actorAtom);
    expect(events).toEqual(["started"]);

    store.get(actorAtom).stop();
  });

  it("keeps an externally owned actor inert during SSR", () => {
    const unsafeEvents: string[] = [];
    const safeEvents: string[] = [];
    const unsafeActorAtom = atomWithActor(createObservedLogic(unsafeEvents));
    const actor = createActor(createObservedLogic(safeEvents));
    const snapshotAtom = atomWithActorSnapshot(actor);
    const store = createStore();

    function Reader() {
      useAtomValue(unsafeActorAtom);
      useAtomValue(snapshotAtom);
      return <span>server output</span>;
    }

    expect(
      renderToString(
        <Provider store={store}>
          <Reader />
        </Provider>,
      ),
    ).toContain("server output");
    expect(unsafeEvents).toEqual(["started"]);
    expect(safeEvents).toEqual([]);

    store.get(unsafeActorAtom).stop();
    actor.stop();
  });

  it("keeps an externally owned actor inert after an abandoned Suspense render", () => {
    const unsafeEvents: string[] = [];
    const safeEvents: string[] = [];
    const unsafeActorAtom = atomWithActor(createObservedLogic(unsafeEvents));
    const actor = createActor(createObservedLogic(safeEvents));
    const snapshotAtom = atomWithActorSnapshot(actor);
    const store = createStore();
    const never = new Promise(() => {});

    function SuspendedReader() {
      useAtomValue(unsafeActorAtom);
      useAtomValue(snapshotAtom);
      throw never;
      return null;
    }

    const view = render(
      <Provider store={store}>
        <Suspense fallback={<span>fallback</span>}>
          <SuspendedReader />
        </Suspense>
      </Provider>,
    );

    expect(view.getByText("fallback")).toBeInTheDocument();
    expect(unsafeEvents).toEqual(["started"]);
    expect(safeEvents).toEqual([]);
    view.unmount();
    expect(safeEvents).toEqual([]);

    store.get(unsafeActorAtom).stop();
    actor.stop();
  });

  it("starts once through StrictMode replay and stops once after final release", async () => {
    const events: string[] = [];
    const actor = createActor(createObservedLogic(events));
    const snapshotAtom = atomWithActorSnapshot(actor);
    let retained = 0;
    let generation = 0;

    function retain() {
      retained += 1;
      generation += 1;
      actor.start();
      let released = false;

      return () => {
        if (released) return;
        released = true;
        retained -= 1;
        const releaseGeneration = ++generation;
        queueMicrotask(() => {
          if (retained === 0 && releaseGeneration === generation) actor.stop();
        });
      };
    }

    function Owner() {
      useLayoutEffect(() => retain(), []);
      return null;
    }

    function Reader() {
      useAtomValue(snapshotAtom);
      return null;
    }

    const view = render(
      <StrictMode>
        <Provider store={createStore()}>
          <Owner />
          <Reader />
        </Provider>
      </StrictMode>,
    );

    await Promise.resolve();
    expect(events).toEqual(["started"]);

    view.unmount();
    await Promise.resolve();
    expect(events).toEqual(["started", "stopped"]);
  });

  it("preserves an externally owned actor and its state across reader remounts", () => {
    const machine = setup({
      types: { events: {} as { type: "increment" } },
    }).createMachine({
      context: { count: 0 },
      on: {
        increment: {
          actions: assign({ count: ({ context }) => context.count + 1 }),
        },
      },
    });
    const actor = createActor(machine).start();
    const snapshotAtom = atomWithActorSnapshot(actor);
    const store = createStore();

    function Reader() {
      useAtomValue(snapshotAtom);
      return null;
    }

    const first = render(
      <Provider store={store}>
        <Reader />
      </Provider>,
    );
    actor.send({ type: "increment" });
    first.unmount();

    const second = render(
      <Provider store={store}>
        <Reader />
      </Provider>,
    );
    expect(actor.getSnapshot().context.count).toBe(1);

    second.unmount();
    actor.stop();
  });

  it("scopes atom-created actors to independent Jotai stores", () => {
    const events: string[] = [];
    const actorAtom = atomWithActor(createObservedLogic(events), {
      autoStart: false,
    });
    const firstStore = createStore();
    const secondStore = createStore();

    const first = firstStore.get(actorAtom);
    const second = secondStore.get(actorAtom);

    expect(first).not.toBe(second);
    expect(events).toEqual([]);
  });

  it("keeps autoStart false inert until manual start", () => {
    const events: string[] = [];
    const actorAtom = atomWithActor(createObservedLogic(events), {
      autoStart: false,
    });
    const actor = createStore().get(actorAtom);

    expect(events).toEqual([]);
    actor.start();
    expect(events).toEqual(["started"]);
    actor.stop();
  });

  it("observes but never stops an externally owned actor", () => {
    const events: string[] = [];
    const actor = createActor(createObservedLogic(events)).start();
    const snapshotAtom = atomWithActorSnapshot(actor);

    function Reader() {
      useAtomValue(snapshotAtom);
      return null;
    }

    const view = render(
      <Provider store={createStore()}>
        <Reader />
      </Provider>,
    );
    view.unmount();
    expect(events).toEqual(["started"]);

    actor.stop();
    expect(events).toEqual(["started", "stopped"]);
  });

  it("shows that an immediate stop and restart re-enters actor logic", () => {
    const events: string[] = [];
    const actor = createActor(createObservedLogic(events));

    actor.start();
    actor.stop();
    actor.start();

    expect(events).toEqual(["started", "stopped", "started"]);
    actor.stop();
  });

  it("cancels a deferred final release when ownership is immediately reacquired", async () => {
    const events: string[] = [];
    const actor = createActor(createObservedLogic(events));
    let retained = 0;
    let generation = 0;

    function retain() {
      retained += 1;
      generation += 1;
      actor.start();
      let released = false;

      return () => {
        if (released) return;
        released = true;
        retained -= 1;
        const releaseGeneration = ++generation;
        queueMicrotask(() => {
          if (retained === 0 && releaseGeneration === generation) actor.stop();
        });
      };
    }

    const releaseFirst = retain();
    releaseFirst();
    const releaseSecond = retain();
    await Promise.resolve();
    expect(events).toEqual(["started"]);

    releaseSecond();
    await Promise.resolve();
    expect(events).toEqual(["started", "stopped"]);
  });

  it("captures initialization getters but reads current Jotai state at command time", () => {
    const settingsAtom = atom("initial");
    const initializedWith = vi.fn();
    const commandReads: string[] = [];
    const machine = setup({
      types: {
        input: {} as { initialized: string; getCurrent: () => string },
        events: {} as { type: "command" },
        context: {} as { initialized: string; getCurrent: () => string },
      },
    }).createMachine({
      context: ({ input }) => {
        initializedWith(input.initialized);
        return input;
      },
      on: {
        command: {
          actions: ({ context }) => commandReads.push(context.getCurrent()),
        },
      },
    });
    const store = createStore();
    const actorAtom = atomWithActor(machine, (get) => ({
      input: {
        initialized: get(settingsAtom),
        getCurrent: () => store.get(settingsAtom),
      },
    }));

    const actor = store.get(actorAtom);
    store.set(settingsAtom, "later");
    actor.send({ type: "command" });

    expect(initializedWith).toHaveBeenCalledWith("initial");
    expect(actor.getSnapshot().context.initialized).toBe("initial");
    expect(commandReads).toEqual(["later"]);
    actor.stop();
  });
});
