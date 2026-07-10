# Evidence: the Jotai-XState lifecycle seam

## Decision

Use a focused workflow module that creates one inert XState actor, exposes one writable Jotai queue atom backed by `atomWithActorSnapshot`, and exposes one `mount()` operation whose returned cleanup stops that owned actor after a StrictMode-safe deferred-release check. Mount that module once inside the root Jotai provider and above the route `<Outlet>`.

Do **not** use `atomWithMachine` for the upload queue, and do not use the default `atomWithActor` lifecycle. `atomWithActor(..., { autoStart: false })` is compatible, but an externally created actor is the smaller and clearer seam here because ownership, cleanup, and the live Jotai-store dependency are explicit.

React sends workflow intent only. The actor's IO effect reads one derived Jotai `storageOperationAtom` at IO start; that derived value contains the latest validated settings, profile generation, and storage-settings revision. Invalid settings return a typed `not-configured` result before adapter creation. React never receives parsed settings and has no parsed-settings dependency.

This rejects a many-method `AppStateRuntime`, a generic dependency-injection container, and a wide `PendingUploadEffects` bag. The focused upload module should have no more than three injected effects—conceptually `processFile`, `uploadFile`, and `onUploaded`—and only two outward interactions: its writable `queueAtom` and `mount()`.

## Actual version baseline

The implementation base is `codex/deepen-image-storage` at `88bda7e`.

| Package                          | Base resolution               | Finding                                                                                                                |
| -------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Jotai                            | 2.15.2                        | Declared as `^2.15.2`; lock resolves 2.15.2.                                                                           |
| XState                           | 5.32.4                        | Declared as `^5.32.4`; lock resolves 5.32.4.                                                                           |
| React / React DOM                | 19.2.3                        | Both resolve 19.2.3.                                                                                                   |
| `jotai-xstate`                   | **not installed or declared** | The handoff's wording implied an existing version, but the base has none. The implementation must add it deliberately. |
| Current published `jotai-xstate` | 0.6.1                         | Its peer range is Jotai `>=2.0.0` and XState `>=5.0.0`; it is the version tested here.                                 |

Primary evidence:

- [`jotai-xstate` 0.6.1 package metadata](https://registry.npmjs.org/jotai-xstate/latest) records the version and peer ranges.
- [The pinned `atomWithActor` 0.6.1 source](https://github.com/jotaijs/jotai-xstate/blob/9ac7c54bf15d94bae429dcf6d829a5693f09c812/src/atomWithActor.ts) calls `createActor` and, by default, `actor.start()` inside the atom read. Its `onMount` only commits the actor to a private cache and has no cleanup.
- [The pinned `atomWithActorSnapshot` 0.6.1 source](https://github.com/jotaijs/jotai-xstate/blob/9ac7c54bf15d94bae429dcf6d829a5693f09c812/src/atomWithActorSnapshot.ts) subscribes on mount and unsubscribes/clears its snapshot on unmount; it does not stop the supplied actor.
- [The pinned `atomWithMachine` 0.6.1 source](https://github.com/jotaijs/jotai-xstate/blob/9ac7c54bf15d94bae429dcf6d829a5693f09c812/src/atomWithMachine.ts) composes those two utilities and therefore inherits the default render-time start. Its public options do not expose `autoStart`.
- [The official Jotai XState page](https://jotai.org/docs/extensions/xstate) explicitly says its `get` is available only for initialization. The newer repository source additionally enforces this with a guarded getter.
- [The official XState actor documentation](https://stately.ai/docs/actors) separates inert `createActor(...)` from `actor.start()` and states that stopping a root actor stops its actor system and descendants.

## Reproducible spike

The durable test source is [the lifecycle spike](./02-lifecycle-spike/lifecycle.test.tsx). It was run in an isolated temporary package so the repository manifests, dependency graph, and lockfile stayed untouched, with these exact resolutions:

```text
jotai 2.15.2
jotai-xstate 0.6.1
xstate 5.32.4
react / react-dom 19.2.3
@testing-library/react 16.3.1
jsdom 27.3.0
vitest 4.0.16
```

Command and result:

```text
pnpm --dir /private/tmp/s3-port-jotai-xstate-lifecycle-spike test

Test Files  1 passed (1)
Tests       11 passed (11)
```

## Proven behavior

| Case                                     | Observed behavior                                                                                                                                   | Consequence                                                                                                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Vanilla `store.get(atomWithActor(...))`  | Actor logic starts immediately, before any React mount.                                                                                             | Default `autoStart` is render/atom-read unsafe for IO-capable workflow actors.                                                           |
| SSR via `renderToString`                 | Reading the actor atom starts the actor although `onMount` never runs.                                                                              | Default `atomWithActor` can start IO on the server.                                                                                      |
| Suspended, never-committed render        | The read starts the actor; rendering the fallback and unmounting do not stop it.                                                                    | Default `atomWithActor` can leak speculative work under Suspense/concurrent rendering.                                                   |
| StrictMode, same Jotai store             | One actor starts because the derived value is cached; replay and final reader unmount do not stop it.                                               | StrictMode does not duplicate this exact mounted read, but the library also provides no final cleanup. This is not sufficient ownership. |
| Reader unmount/remount in the same store | The same actor and its state survive.                                                                                                               | A store above the route can preserve route-independent state, but lifetime must still have an explicit final owner.                      |
| A second Jotai store                     | A distinct actor starts.                                                                                                                            | Store identity scopes the actor; server requests and independent roots must not share a singleton store/module.                          |
| `autoStart: false`                       | Reading creates an inert actor; an explicit `start()` activates it.                                                                                 | It prevents render-time IO, but does not add cleanup or command-time dependency reads.                                                   |
| `atomWithActorSnapshot(externalActor)`   | It subscribes reactively and leaves the actor running after reader unmount.                                                                         | This is the correct observation primitive when the workflow module owns start/stop.                                                      |
| Immediate stop/start                     | Actor logic re-enters (`started`, `stopped`, `started`).                                                                                            | A naive StrictMode effect cleanup duplicates activation work and can destroy/recreate child work.                                        |
| Deferred final release                   | StrictMode setup/cleanup/setup settles to one start; real final unmount produces one stop.                                                          | `mount()` must defer a zero-owner stop by one microtask and cancel it when replay reacquires ownership.                                  |
| Getter-derived actor input               | The initialization value stays `initial` after the atom changes to `later`; a closure using the external Jotai store reads `later` at command time. | Actor options are initialization snapshots. Live settings must come through a stable store-backed operation, not the integration getter. |

The source audit is stronger than the React examples alone: `atomWithActor` runs `actor.start()` in its read function, while `atomWithActorSnapshot` never calls `stop()`. Those statements hold for any read path, not only the renderer cases sampled by the spike.

## Small viable seam

The implementation should remain JavaScript-like and inference-first. The core settings value continues to be inferred from its Zod schema; only command outcomes and the actor event boundary need explicit discriminated types.

Conceptually:

```ts
const storageOperationAtom = atom((get) => {
  const settings = get(validatedStorageSettingsAtom);
  if (!settings) return;

  return {
    settings,
    profileGeneration: get(profileGenerationAtom),
    storageSettingsRevision: get(storageSettingsRevisionAtom),
  };
});

const uploads = createUploadQueue({
  processFile,
  async uploadFile(input) {
    const operation = store.get(storageOperationAtom);
    if (!operation) return { ok: false, reason: "not-configured" };

    // Adapter construction and put begin only after the current operation
    // snapshot has been captured here, at IO start.
    return putStoredImage(operation, input);
  },
  onUploaded(fact) {
    store.set(confirmUploadedImageAtom, fact);
  },
});
```

Inside `createUploadQueue`, create the actor without starting it, wrap the stable actor with `atomWithActorSnapshot`, and combine snapshot read plus event send into one writable `queueAtom`. Return only:

```ts
return { queueAtom, mount };
```

`mount()` starts the owned actor after commit and returns an idempotent cleanup. Its cleanup decrements the owner count and schedules `actor.stop()` in a microtask only if no replay/remount reacquires it. After a real final stop, discard that module instance rather than reusing it for a different Jotai store/root.

Place the focused owner inside the root `JotaiProvider` and around/above `<Outlet>`. The base currently creates `UploadQueueProvider` inside `Upload`, so navigation destroys the queue; moving this one owner above the route is the required lifetime change. Reader components and upload-route effects may unmount without stopping the workflow.

## Cleanup ownership rules

1. The focused workflow module stops only the actor it created.
2. `atomWithActorSnapshot` owns only its subscription and snapshot cache; it never stops the actor.
3. A test-injected external module/actor remains owned by its creator. Do not infer ownership from receiving a reference.
4. Stopping the root upload actor is sufficient to stop its spawned pending-upload children through the XState actor system.
5. No route component, selector atom, or command atom calls `stop()`.

## Explicit rejections

- **Reject `atomWithMachine`** for this seam: it starts while its atom is read and has no typed manual-start option or actor cleanup.
- **Reject default `atomWithActor`**: its source contradicts the loose phrase “as soon as it mounts”; it starts on the first atom read, including SSR and suspended renders.
- **Do not treat `autoStart: false` as the whole solution**: it prevents start but supplies neither final ownership nor live settings.
- **Reject initialization getter capture**: the `get` passed to `jotai-xstate` is intentionally initialization-only and cannot be a live Jotai getter.
- **Reject an `AppStateRuntime` replacement**: do not return settings, catalog, cache, sync, upload, storage helpers, lifecycle, and testing instances from one object.
- **Reject a generic DI/effect bag**: hide adapter construction and settings/revision reads behind the one deep `uploadFile` operation instead of injecting many getters and pass-through methods.
- **Do not broadly rewrite existing atoms/effects**: add the derived operation snapshot and move only the upload owner; preserve existing reactive settings and upload UI reads unless a later ticket proves a change is necessary.

## Verification gates for implementation

- Server render and a suspended never-commit path produce zero actor starts and zero storage calls.
- StrictMode produces exactly one workflow activation and no duplicate child processing/list/put calls.
- Upload-route unmount/remount preserves the queue actor and pending child identities.
- Final root/module disposal stops the owned actor and children exactly once; injected external actors are not stopped.
- Settings changed before upload IO begins are the settings used; invalid settings cause zero adapter creation/put.
- Completion is accepted only when captured profile generation and storage-settings revision are still current.
- React command callbacks do not depend on parsed settings objects.

## Limitations

- The compatibility run used jsdom plus React server rendering, not a browser scheduler. The pinned source location of `actor.start()` in the atom read makes the SSR/speculative-render conclusion independent of jsdom, but the implementation should still keep its existing browser/StrictMode remote-call-count gate.
- `jotai-xstate` 0.6.1 is compatible in this matrix but is not currently a base dependency. Adding and locking it belongs to implementation, not this planning ticket.
- This resolves the lifecycle seam for upload and any similarly long-lived workflow. It does not decide whether the catalog remains an actor; that module-boundary decision can reuse the same ownership rule if an actor is selected.
