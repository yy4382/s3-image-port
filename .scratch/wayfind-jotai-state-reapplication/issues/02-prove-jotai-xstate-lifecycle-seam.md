# Prove the Jotai-XState lifecycle seam

Type: task
Status: resolved

## Question

What lifetime and dependency-injection seam actually works for the repository's Jotai 2, XState 5, React 19, and `jotai-xstate` versions without starting IO during render, losing route-independent workflow state on unmount, duplicating work under StrictMode, or freezing initialization-time atom values?

Create only the smallest isolated spike and linked evidence needed to decide. Verify at least:

- `atomWithActor` or `atomWithMachine` behavior under SSR, Suspense/concurrent rendering, StrictMode replay, mount/unmount/remount, manual start, and cleanup;
- whether `autoStart: false` is sufficient or an externally created long-lived actor is required for upload queue and image catalog lifetimes;
- whether the actor is stopped only by the composition owner that created it;
- how commands read the latest validated settings, profile generation, and storage-settings revision at invocation/IO start rather than capturing initialization input or requiring parsed settings in React dependencies;
- whether the working seam can stay small and focused instead of recreating a many-method `AppStateRuntime` or a generic dependency-injection container.

The spike may add disposable or scratch-only test code, but it must not begin the production migration. Record reproducible results and recommend the smallest viable seam.

## Answer

[The lifecycle evidence and recommendation](../assets/02-jotai-xstate-lifecycle-seam.md) select an externally owned, inert actor observed through `atomWithActorSnapshot`, exposed as one writable workflow atom plus a StrictMode-safe `mount()` cleanup above the route boundary. Default `atomWithActor`/`atomWithMachine` are rejected because version 0.6.1 starts during atom read (including SSR and suspended renders) and does not stop on unmount; initialization getters also freeze their values. A focused IO operation reads one derived Jotai settings/generation/revision snapshot at IO start, so React sends intent only and no `AppStateRuntime` or generic DI bag is needed. The exact React 19.2.3/Jotai 2.15.2/XState 5.32.4/`jotai-xstate` 0.6.1 matrix passed 11 isolated checks. The base does not currently declare `jotai-xstate`, so adding and locking 0.6.1 remains an implementation step rather than a change made by this planning ticket.
