import { atom, type createStore } from "jotai";
import { selectAtom } from "jotai/utils";
import { atomWithActorSnapshot } from "jotai-xstate";
import { createActor } from "xstate";

import { processFile } from "@/lib/utils/imageCompress";

import {
  selectHasUploaded,
  selectUploadCounts,
  selectUploadActors,
  uploadQueueMachine,
  type UploadQueueEvent,
} from "./machines/upload-queue-machine";
import type { PendingUploadEffects } from "./machines/pending-upload-machine";
import { createStorePendingUpload } from "./store-pending-upload";

function makeUploadQueueActor(
  store: ReturnType<typeof createStore>,
  effects: Partial<PendingUploadEffects>,
) {
  return createActor(uploadQueueMachine, {
    input: {
      effects: {
        processFile,
        onProcessingFailed() {},
        ...effects,
        storePendingUpload:
          effects.storePendingUpload ??
          createStorePendingUpload({
            store,
            onUploadFailed() {},
          }),
      },
    },
  });
}

const actorAtom = atom<ReturnType<typeof makeUploadQueueActor> | null>(null);
const snapshotAtom = atomWithActorSnapshot(
  (get) => get(actorAtom) ?? undefined,
);

const queueViewAtom = selectAtom(
  snapshotAtom,
  (snapshot) => ({
    uploads: selectUploadActors(snapshot),
    hasUploaded: selectHasUploaded(snapshot),
    counts: selectUploadCounts(snapshot),
  }),
  (left, right) =>
    left.uploads === right.uploads &&
    Object.keys(left.counts).every(
      (key) =>
        left.counts[key as keyof typeof left.counts] ===
        right.counts[key as keyof typeof right.counts],
    ),
);

export const uploadQueue = atom(
  (get) => {
    const actor = get(actorAtom);
    if (!actor)
      return {
        uploads: [],
        hasUploaded: false,
        counts: {
          pending: 0,
          failed: 0,
          uploaded: 0,
          uploading: 0,
          processing: 0,
          unconfirmed: 0,
        },
      };
    return get(queueViewAtom);
  },
  (get, _set, event: UploadQueueEvent) => {
    get(actorAtom)?.send(event);
  },
);

export function createUploadQueue(
  store: ReturnType<typeof createStore>,
  effects: Partial<PendingUploadEffects> = {},
  injected?: {
    actor: ReturnType<typeof makeUploadQueueActor>;
    ownership: "caller" | "queue";
  },
) {
  const actor = injected?.actor ?? makeUploadQueueActor(store, effects);
  const ownsActor = injected?.ownership !== "caller";
  let retained = 0;
  let generation = 0;
  let started = false;
  let disposed = false;

  function mount() {
    if (disposed)
      throw new Error("A disposed upload queue cannot be remounted");
    retained += 1;
    generation += 1;
    if (!started) {
      actor.start();
      store.set(actorAtom, actor);
      started = true;
    }
    let released = false;

    return () => {
      if (released) return;
      released = true;
      retained -= 1;
      const releaseGeneration = ++generation;
      queueMicrotask(() => {
        if (retained !== 0 || releaseGeneration !== generation) return;
        store.set(actorAtom, null);
        if (ownsActor) {
          actor.stop();
          disposed = true;
        }
        started = false;
      });
    };
  }

  return { atom: uploadQueue, mount };
}
