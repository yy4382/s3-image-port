# Tickets: Jotai-first state reapplication

Reapply the accepted behavior corrections onto `88bda7e` while retaining Jotai for ordinary state and XState only for upload workflows. The durable source is the [completed Wayfinder map](.scratch/wayfind-jotai-state-reapplication/map.md), especially the [ten-slice route](.scratch/wayfind-jotai-state-reapplication/issues/08-choose-reactivity-safe-reapplication-slices.md), [reactivity contract](.scratch/wayfind-jotai-state-reapplication/issues/06-define-reactivity-preservation-contract.md), and [ADR-0003](docs/adr/0003-keep-client-state-in-jotai.md).

Work the **frontier**: any ticket whose blockers are all complete. Keep each accepted correction's failing test and implementation in the same ticket. Every reactive edit must prove both the relevant update and the unrelated non-update. The catalog and upload cutovers are indivisible rollback units.

## Establish the behavioral baseline and deterministic harness

**What to build:** A trustworthy, behavior-level test baseline and reusable deterministic controls that distinguish adapter construction, remote calls, persistence, renders, navigation, and asynchronous completion order before any production authority changes.

**Blocked by:** None — can start immediately.

- [x] Record the existing settings, profile/form, gallery, URL/modal, upload, sync, cache, and natural-size suite results from the untouched implementation base.
- [x] Preserve `main` behavior as the ordinary oracle while identifying the eight accepted corrections as intentional deviations rather than desirable base characterizations.
- [x] Add counted `createStorage` and per-operation adapters, deferred promises, controllable browser storage, stable IDs, StrictMode mounting, render/subscription counters, and observer/frame cleanup controls.
- [x] Controls distinguish local persistence writes from adapter construction and every remote method, support both completion orders, and remain unchanged after at least ten drained microtasks and relevant timers.
- [x] Tests and fixtures use domain language and inference-first TypeScript; production code imports no test harness or generic effect/runtime bag.
- [x] Existing production behavior and persisted data are unchanged.

## Pin and codify the Jotai-XState lifecycle contract

**What to build:** A pinned, repository-level compatibility contract proving the exact safe lifecycle seam for the long-lived upload workflow before that workflow moves above the route.

**Blocked by:** Establish the behavioral baseline and deterministic harness.

- [x] Add and pin `jotai-xstate` `0.6.1` without adding `@xstate/store` or `@xstate/store-react` or removing Jotai/Jotai optics.
- [x] Promote the isolated lifecycle evidence into repository tests covering vanilla reads, SSR, abandoned Suspense, StrictMode, remount, independent Jotai stores, manual start, external snapshot actors, deferred final release, and command-time store reads.
- [x] Prove zero actor starts during SSR/speculative render, one start through StrictMode replay, route-reader remount survival, and one stop on true final owned disposal.
- [x] Prove initialization getters are snapshots and current settings must be read from the Jotai store at IO start.
- [x] Land no dormant production actor, provider, lifecycle facade, or generic actor factory in this ticket.
- [x] Manifest, lockfile, and compatibility tests form one reversible unit.

## Deepen settings in place

**What to build:** The accepted five-atom settings interface, evolved from the existing persistence and focused-atom graph, with stable projections, semantic no-ops, typed profile outcomes, command-time access testing, and exact profile-replacement classification.

**Blocked by:** Establish the behavioral baseline and deterministic harness.

- [x] Expose exactly `profiles`, `storage`, `upload`, `gallery`, and `replaceProfile`; callers and tests use these atoms directly without a context, provider, selector family, hook family, or command facade.
- [x] Preserve the existing storage key, versioned envelope, migrations, defaults, ordering, active-index behavior, import/export behavior, sync payload, forms, and sync workflow.
- [x] Structurally equal writes preserve references and perform zero notification or persistence; unrelated edits preserve each unaffected projection's identity.
- [x] `storage` owns raw values, Zod validation/errors, parsed settings, broad revision, semantic target identity, and access-test status/command.
- [x] Invalid access testing constructs no adapter and performs no IO; valid testing makes exactly one adapter/access call; stale/disposed completion cannot publish after a storage revision change.
- [x] `replaceProfile` changes settings only and accurately reports genuine active-profile replacement versus ordinary/equal/inactive operations.
- [x] The external composition write is the sole replacement-capable caller and temporarily targets the currently authoritative base gallery reset exactly once.
- [x] All old public settings atoms/setters become private in the same cutover; no aliases or compatibility wrappers remain.
- [x] Paired render/subscription tests prove relevant controls update within their bounds and unrelated settings/access/catalog changes produce zero commits.

## Extract the pure catalog kernel

**What to build:** A dormant, pure, independently verified catalog kernel for cache classification and projection/reconciliation rules, with no active Jotai, React, browser-storage, actor, or remote edge.

**Blocked by:** Establish the behavioral baseline and deterministic harness.

- [x] Define core stored-image and confirmed-fact data through colocated Zod schemas and inferred types rather than a preliminary type inventory.
- [x] Cover absent, malformed, cached-empty, listed-empty, and ready cache classification while preserving the bare `StoredImage[]` payload.
- [x] Cover confirmed upload/delete/rename application, rename ordering, listing start revision, both completion orders, journal pruning, semantic no-ops, and generation reset.
- [x] Cache-write failure produces diagnostic facts without pretending the accepted in-memory projection rolled back.
- [x] Pure tests use worked examples and public kernel functions, not machine context/events copied from the rejected refactor.
- [x] The kernel exports no atom, provider, subscription, timer, browser write, adapter construction, or remote operation.

## Cut over the deep image catalog authority

**What to build:** One large, deep Jotai/plain image-catalog module that atomically replaces every old catalog writer and target-dependent action while preserving the existing view graph and user behavior.

**Blocked by:** Deepen settings in place; Extract the pure catalog kernel.

- [x] Expose exactly `state`, `view`, `item(key)`, `run`, and `integrate`; no actor, provider, selector registry, command-hook family, lifecycle facade, or second projection exists.
- [x] Preserve the existing filter/search/sort/page/page-size/selection derivations and React URL ownership with the smallest possible reactive edits.
- [x] Deepen the sole projection to distinguish unloaded/known-empty/ready, retain last-good data, enforce semantic target mismatch, and keep the existing cache key/payload.
- [x] `run` owns joined foreground/background refresh, probe/download/link safety, delete/rename reservations, command joining/conflict, typed outcomes, cache writes, and stale completion rejection.
- [x] `integrate` accepts only confirmed upload and profile-replacement facts and reconciles both completion orders through the pure kernel.
- [x] `item(key)` is mount-local and collectible; key A updates only for A selection/reservation/access changes, never through an unbounded family/registry.
- [x] Invalid settings and target mismatch perform zero adapter/remote work; concurrent refresh/probe joins, disjoint mutations, overlapping rejection, and exact call counts match the contract.
- [x] Upload/delete/rename versus listing races, cache failures, profile replacement, stale settings/generation, and uncertain outcomes preserve projection/selection/cache semantics in both completion orders.
- [x] Manual/empty/background refresh, target mismatch/rebind, photo actions, modal behavior, selection, and feedback retain the accepted user-visible behavior.
- [x] Every old listing writer, writable image export, dirty/reset path, direct storage hook, and per-command orchestration path is deleted in this same atomic cutover; no dormant fallback or feature flag remains.
- [x] The profile-replacement composition write retargets from the base reset to `integrate("profile-replaced")` in the same diff, never invoking both.

## Correct the React-owned gallery URL edge

**What to build:** A narrowly corrected React/router synchronization edge that preserves URL ownership outside the catalog and settles every semantic navigation exactly once.

**Blocked by:** Cut over the deep image catalog authority.

- [x] Keep URL parsing, normalization, serialization, history, and URL-backed-field choice in the existing React/router area; catalog/view atoms remain passive data.
- [x] Compare canonical semantic route values, not object identity or key order, and track user versus external origin without copying the rejected broad route hook.
- [x] Canonical direct load performs no navigation; invalid/default normalization performs one replace; one semantic user edit performs at most one push and no acknowledgement echo.
- [x] Back/forward, two rapid external commits, user-edit/external-navigation races, and stale acknowledgements converge to the latest external state once.
- [x] Selection and current page stay outside the URL; modal back/Escape/delete/rename return to the exact captured gallery search state.
- [x] Route cases perform zero storage/cache/actor IO and stop producing renders/navigation after settlement.
- [x] Superseded refs/effect code is deleted in the same focused slice; no route facade or second synchronization owner appears.

## Move upload ownership above the route

**What to build:** A route-independent upload queue using the pinned external-actor/Jotai seam, current command-time settings, stale completion protection, immediate catalog integration, and inert editing during processing/uploading.

**Blocked by:** Pin and codify the Jotai-XState lifecycle contract; Deepen settings in place; Cut over the deep image catalog authority.

- [x] One focused owner inside the existing root Jotai provider and above the route creates an inert queue actor, starts after commit, survives route unmount, and stops only its owned actor on true final disposal.
- [x] React uses one writable Jotai queue atom; the route-local provider and selector/command facade are deleted in this same atomic cutover.
- [x] Upload IO reads current validated settings, generation, and revision when put begins; React passes intent/files only.
- [x] Invalid settings perform zero adapter/put; current success returns a confirmed stored image and calls catalog `integrate` once; obsolete completion becomes superseded and never integrates.
- [x] Route unmount/remount preserves queue/child identity and in-flight work without duplicate processing/put; SSR/Suspense/StrictMode start/stop counts match the lifecycle contract.
- [x] Each preview subscribes once; entering processing/uploading closes and disables editing in the same settled transition, and impossible edit events are rejected by the machine.
- [x] Child A does not rerender for child B or unrelated catalog/settings changes; aggregate controls update only for real aggregate changes.
- [x] Successful integration appears immediately and schedules/joins exactly one reconciliation; duplicate notifications are idempotent and no automatic retry is introduced.

## Close profile replacement, sync, form, and natural-size behavior

**What to build:** One exact profile-replacement path across load/import/sync, mounted-form rebasing, catalog generation/reset, and the independent natural-size cache while leaving ordinary edits and the sync workflow untouched.

**Blocked by:** Deepen settings in place; Cut over the deep image catalog authority.

- [x] Every genuine active load/import/sync/remote-wins ingress uses the single composition write; ordinary, equal, inactive, metadata-only, and already-active operations do not.
- [x] One genuine replacement performs at most one settings write, one generation advance, one catalog integration/cache clear, one natural-size clear, and one eligible joined background list or zero when ineligible.
- [x] A mounted settings form with an invalid draft rebases to the replacement exactly once without its outward listener restoring the old draft or duplicating persistence/reset/list work.
- [x] Ordinary no-ops, access status, rename/duplicate/inactive changes, and equal sync/import do not rebase the form or erase its draft.
- [x] The current React Query/Jotai sync confirmation/conflict/token/config behavior and stable sync projection are preserved; sync gains no catalog/cache knowledge.
- [x] The natural-size cache retains its current key, payload, LRU, debounce, fallback, and ownership; it clears once only for genuine replacement.
- [x] Old access/list/mutation/upload/probe completions after replacement cannot repopulate state or publish stale UI feedback.
- [x] Repository search finds no direct replacement setter or reset outside the composition write.

## Apply independent switch, measurement, and ignore fixes

**What to build:** Three small independent corrections: native-button switch behavior, complete gallery measurement cleanup, and ignoring the local pnpm store.

**Blocked by:** Establish the behavioral baseline and deterministic harness.

- [x] The animated switch defaults to native-button behavior and mounts without the Base UI button-contract warning.
- [x] The existing atom-based gallery measurement path cancels its initial animation frame and disconnects its observer on unmount without changing layout output.
- [x] StrictMode and unmount-before/after-frame tests leave no live observer/frame or post-unmount write.
- [x] `.pnpm-store` is ignored by reproducing the independent one-line change without coupling to mixed refactor history.
- [x] The fixes introduce no new abstraction, type inventory, storage/remote behavior, or unrelated UI change.

## Run deletion proofs and final reactivity review

**What to build:** A completed, verified Jotai-first implementation with all replaced authorities deleted, all public interfaces still deep and small, and the entire behavioral/reactivity/IO/race contract passing.

**Blocked by:** Correct the React-owned gallery URL edge; Move upload ownership above the route; Close profile replacement, sync, form, and natural-size behavior; Apply independent switch, measurement, and ignore fixes.

- [x] Repository searches prove there is no XState Store app state, app-state runtime/provider tree, catalog actor/machine, settings facade, selector registry, sync/natural-size actor, compatibility wrapper, shadow projection, dormant provider, or runtime flag.
- [x] Exactly one settings persistence/projection owner, catalog projection reducer, refresh execution edge, profile-replacement composition write, React/router synchronization owner, and upload actor owner remain.
- [x] Settings and catalog still expose exactly five interactions each, with no front-loaded standalone type inventory or family of thin wrappers/hooks/selectors.
- [x] All protected base/main suites, paired positive/negative subscriber tests, reference-identity checks, committed-render bounds, settling checks, lifecycle tests, exact IO/persistence counts, URL interleavings, form/probe behavior, route lifetime, cache failures, reservations, stale completions, and both race orders pass.
- [x] Full web test, build, lint, and repository-appropriate type gates pass after deletion.
- [x] Manual behavior checks cover profile forms/switching, sync confirmation, gallery URL/modal navigation, refresh feedback, target mismatch/rebind, selection locality, upload navigation/editing/retry, and cache reset.
- [x] No credentialed S3 smoke is claimed unless credentials are actually configured; deterministic counted adapters remain the required race/IO authority.
- [ ] Completed slices are reviewed against ADR-0003 and the resolved spec, with all actionable Standards and Spec findings fixed.
