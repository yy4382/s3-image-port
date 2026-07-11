// Reproduction matrix:
// jotai 2.15.2, jotai-xstate 0.6.1, xstate 5.32.4,
// react/react-dom 19.2.3, @testing-library/react 16.3.1,
// jsdom 27.3.0, vitest 4.0.16.
// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { atom, createStore, Provider, useAtomValue } from "jotai";
import { atomWithActor, atomWithActorSnapshot } from "jotai-xstate";
import React, { StrictMode, Suspense, useLayoutEffect } from "react";
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

describe("jotai-xstate 0.6.1 lifecycle", () => {
  it("autoStart starts during the first vanilla read, before any mount", () => {
    const events: string[] = [];
    const actorAtom = atomWithActor(createObservedLogic(events));
    const store = createStore();

    expect(events).toEqual([]);
    store.get(actorAtom);
    expect(events).toEqual(["started"]);
    store.get(actorAtom).stop();
  });

  it("autoStart false is inert during read and can be started manually", () => {
    const events: string[] = [];
    const actorAtom = atomWithActor(createObservedLogic(events), {
      autoStart: false,
    });
    const store = createStore();

    const actor = store.get(actorAtom);
    expect(events).toEqual([]);
    actor.start();
    expect(events).toEqual(["started"]);
    actor.stop();
  });

  it("SSR starts an autoStart actor while rendering even though onMount never runs", () => {
    const events: string[] = [];
    const actorAtom = atomWithActor(createObservedLogic(events));
    const store = createStore();

    function Reader() {
      useAtomValue(actorAtom);
      return <span>server output</span>;
    }

    expect(
      renderToString(
        <Provider store={store}>
          <Reader />
        </Provider>,
      ),
    ).toContain("server output");
    expect(events).toEqual(["started"]);
    store.get(actorAtom).stop();
  });

  it("a suspended uncommitted reader starts the actor and does not clean it up", () => {
    const events: string[] = [];
    const actorAtom = atomWithActor(createObservedLogic(events));
    const store = createStore();
    const never = new Promise(() => {});

    function SuspendedReader() {
      useAtomValue(actorAtom);
      throw never;
    }

    const view = render(
      <Provider store={store}>
        <Suspense fallback={<span>fallback</span>}>
          <SuspendedReader />
        </Suspense>
      </Provider>,
    );
    expect(view.getByText("fallback")).toBeTruthy();
    expect(events).toEqual(["started"]);
    view.unmount();
    expect(events).toEqual(["started"]);
    store.get(actorAtom).stop();
  });

  it("StrictMode uses one started actor but final unmount does not stop it", () => {
    const events: string[] = [];
    const actorAtom = atomWithActor(createObservedLogic(events));
    const snapshotAtom = atomWithActorSnapshot((get) => get(actorAtom));
    const store = createStore();

    function Reader() {
      useAtomValue(snapshotAtom);
      return null;
    }

    const view = render(
      <StrictMode>
        <Provider store={store}>
          <Reader />
        </Provider>
      </StrictMode>,
    );

    expect(events).toEqual(["started"]);
    const actor = store.get(actorAtom);
    view.unmount();
    expect(events).toEqual(["started"]);
    actor.stop();
    expect(events).toEqual(["started", "stopped"]);
  });

  it("remounting readers in the same store preserves the actor and state", () => {
    const machine = setup({
      types: { events: {} as { type: "increment" } },
    }).createMachine({
      context: { count: 0 },
      on: {
        increment: {
          actions: assign({
            count: ({ context }) => context.count + 1,
          }),
        },
      },
    });
    const actorAtom = atomWithActor(machine);
    const snapshotAtom = atomWithActorSnapshot((get) => get(actorAtom));
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
    const actor = store.get(actorAtom);
    actor.send({ type: "increment" });
    first.unmount();

    const second = render(
      <Provider store={store}>
        <Reader />
      </Provider>,
    );
    expect(store.get(actorAtom)).toBe(actor);
    expect(store.get(actorAtom).getSnapshot().context.count).toBe(1);
    second.unmount();
    actor.stop();
  });

  it("a new Jotai store creates a distinct actor", () => {
    const events: string[] = [];
    const actorAtom = atomWithActor(createObservedLogic(events));
    const firstStore = createStore();
    const secondStore = createStore();

    const first = firstStore.get(actorAtom);
    const second = secondStore.get(actorAtom);
    expect(first).not.toBe(second);
    expect(events).toEqual(["started", "started"]);
    first.stop();
    second.stop();
  });

  it("atomWithActorSnapshot never stops an externally owned actor", () => {
    const events: string[] = [];
    const actor = createActor(createObservedLogic(events)).start();
    const snapshotAtom = atomWithActorSnapshot(actor);
    const store = createStore();

    function Reader() {
      useAtomValue(snapshotAtom);
      return null;
    }

    const view = render(
      <Provider store={store}>
        <Reader />
      </Provider>,
    );
    view.unmount();
    expect(events).toEqual(["started"]);
    actor.stop();
    expect(events).toEqual(["started", "stopped"]);
  });

  it("a deferred-stop composition owner settles StrictMode and stops on final unmount", async () => {
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

    function Activation() {
      useLayoutEffect(() => retain(), []);
      return null;
    }

    const view = render(
      <StrictMode>
        <Activation />
      </StrictMode>,
    );
    await Promise.resolve();
    expect(events).toEqual(["started"]);
    view.unmount();
    await Promise.resolve();
    expect(events).toEqual(["started", "stopped"]);
  });

  it("immediate stop/start re-enters actor logic and would duplicate activation work", () => {
    const events: string[] = [];
    const actor = createActor(createObservedLogic(events));
    actor.start();
    actor.stop();
    actor.start();
    expect(events).toEqual(["started", "stopped", "started"]);
    actor.stop();
  });

  it("option getters capture initialization state, while commands can read current state", () => {
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
