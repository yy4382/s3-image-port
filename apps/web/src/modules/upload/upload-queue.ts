import { atom, type createStore } from "jotai";
import { atomWithActorSnapshot } from "jotai-xstate";
import { createActor } from "xstate";
import { toast } from "sonner";

import { processFile } from "@/lib/utils/imageCompress";

import {
  selectHasUploaded,
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
        onProcessingFailed(file, error) {
          toast.error(`Processing failed for ${file.name}`);
          console.error("Processing failed", error);
        },
        ...effects,
        storePendingUpload:
          effects.storePendingUpload ??
          createStorePendingUpload({
            store,
            onUploadFailed(_file, error) {
              console.error("Upload failed", error);
            },
          }),
      },
    },
  });
}

const actorAtom = atom<ReturnType<typeof makeUploadQueueActor> | null>(null);
const snapshotAtom = atomWithActorSnapshot(
  (get) => get(actorAtom) ?? undefined,
);

export const uploadQueue = atom(
  (get) => {
    const actor = get(actorAtom);
    if (!actor) return { uploads: [], hasUploaded: false };
    const snapshot = get(snapshotAtom);
    return {
      uploads: selectUploadActors(snapshot),
      hasUploaded: selectHasUploaded(snapshot),
    };
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
