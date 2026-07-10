# Define the React reactivity preservation contract

Type: grilling
Status: resolved
Blocked by: 01, 04, 05

## Question

What evidence and change limits must every implementation slice satisfy so the reapplication cannot silently break Jotai/React reactivity while preserving the intended behavior corrections?

Using the protected paths from [Inventory reapplication and reactivity deltas](01-inventory-reapplication-and-reactivity-deltas.md) and the chosen settings/catalog interfaces, define:

- which existing atoms, derived atoms, providers, and effects remain untouched by default;
- the burden of proof for editing or deleting any reactive path;
- stable reference and command identity guarantees;
- bounded render expectations for representative settings controls, gallery controls, photo items, modal actions, and upload controls;
- StrictMode/SSR/Suspense mount-settling and cleanup guarantees;
- URL hydration/serialization echo prevention;
- exact remote-call-count and invalid-settings zero-IO assertions;
- stale closure/completion and route-unmount lifetime coverage;
- a review method that detects missing reactivity, not only loops or excess renders.

Prefer behavioral and contract tests at existing seams. Do not require a wholesale atom rewrite merely to make internals easier to test.

## Comments

- The user explicitly delegated this decision to the agent and instructed it not to run a HITL grilling exchange. Resolve autonomously from the accepted map decisions and repository evidence.

## Answer

React reactivity is a compatibility surface, not an implementation detail. Every implementation slice starts from `88bda7e`, uses `main` at `72e942667f2fe31b047dae663e4f5484964983c4` as the ordinary UI oracle, and may differ only for the eight accepted corrections in [the reapplication inventory](../assets/01-reapplication-reactivity-inventory.md) or a later explicit decision. Passing the rejected refactor's tests is not evidence by itself.

The contract has two equal halves:

1. **No excess work:** an unrelated state change must not notify an unaffected subscriber, rerun an effect, navigate, persist, construct storage, or call the remote adapter.
2. **No missed work:** every semantically relevant change must notify the narrow subscriber and settle the visible UI exactly once. A test suite that proves only the first half is incomplete.

### Protected-by-default paths

Keep these base paths and their established reactive direction unless a slice names the accepted behavior that requires a focused edit:

- the one root Jotai provider in `apps/web/src/routes/__root.tsx`;
- `atomWithStorageMigration`, the settings persistence root, `optionsAtom`, focused optics atoms, lazy hydration, function updates, migration cleanup, and the base profile/sync tests;
- the existing gallery filter, page, page-size, selection, prefix/filter/sort/page derivations, natural-size notification/layout atoms, and their dependency direction;
- the `Gallery` auto-refresh effect, the two React/router URL synchronization edges, modal return/navigation effects, mounted photo load/error/probe behavior, and settings form listeners;
- the upload queue and pending-upload machines and their child lifecycle; and
- the existing React Query/Jotai sync workflow.

The catalog projection atom is the one representation that is already authorized to deepen so it can distinguish unloaded from known-empty and keep reconciliation metadata. The other gallery atoms may move behind `imageCatalog.view` with mechanical import changes, but moving them is not permission to reimplement their behavior. The root may gain the focused upload owner above `<Outlet>`, but the Jotai provider is not replaced or nested behind a new app-state provider.

The accepted public surfaces remain exactly the five settings atoms and five catalog interactions:

```text
settings:     profiles, storage, upload, gallery, replaceProfile
imageCatalog: state, view, item(key), run, integrate
```

Contract tests use these same atoms through a vanilla Jotai store or ordinary React hooks. They may inject counted storage and controllable browser storage, but they must not read private request tokens, revisions, journals, reservations, schedulers, or private atoms merely to make an assertion convenient.

### Burden of proof for a reactive edit or deletion

Before changing an atom, derived atom, provider, effect, subscription, or form listener, the slice must record all of the following in its ticket/PR description:

1. the named accepted correction or interface cutover that requires the edit;
2. the old observable path from source write to subscriber/effect/IO;
3. the intended path after the edit;
4. one **positive transition** that must now notify or rerun, and one **negative transition** that must not;
5. expected reference, committed-render, navigation, persistence, adapter-construction, and remote-call deltas; and
6. the old authority that will be deleted in the same slice.

The positive and negative transitions must be executable tests before the old path is removed. For a correction, the positive test should fail against the base or an isolated reproduction before the implementation is added. For preserved behavior, first add or retain a characterization test that passes against the base/main seam. A changed `useEffect` is not approved by an exhaustive-deps check alone: its test must prove a relevant dependency causes the effect and an irrelevant dependency does not. A new equality function is not approved by an excess-render test alone: its test must also prove a changed selected value is delivered.

A reactive path may be deleted only when `rg` shows no callers/subscribers, the replacement owns every positive and negative transition, and counted tests show there is no second writer, effect, subscription, or IO trigger. “The new tests pass” is insufficient if a broad main/base UI suite was deleted or reduced; retain those suites until each lost assertion has an explicit equivalent. Do not leave aliases, pass-through hooks, compatibility facades, duplicated subscriptions, dormant providers, or shadow writable state after a cutover.

If a slice cannot state this proof without touching several protected path families, split it. Broad formatting or import relocation must not conceal a behavioral edit.

### Stable identity and semantic notification rules

Identity assertions are made after initial hydration/effects settle. A structurally equal write is a complete no-op: it preserves references, sends no atom notification, writes no persistence, and performs no IO.

For `settings`:

- The module object and its five atom objects are created once for the creator/singleton lifetime; their state remains isolated by Jotai store. They are never created in render. `useSetAtom` for the same atom/store remains a stable command function.
- The profiles envelope and sync-format value retain independent identity. The envelope changes only when persisted profile data or the active index changes. The sync-format value changes only when its list payload changes, not for an active-index-only update. Access status and catalog/view state recreate neither value.
- `settings.storage` reuses the raw value, valid/invalid validation branch, parsed value/errors, target ID, and access branch independently. Its broad read value may change when one branch changes, so a field or status component that needs one branch may define one module-scope `selectAtom`; the settings module must not export a selector family.
- `settings.upload` and `settings.gallery` remain the existing focused atom instances or direct evolutions. An unrelated profile/storage/access edit preserves their `===` value and produces no subscriber commit.
- `settings.replaceProfile` is one stable write atom. It does not expose a second profile setter or cause ordinary edits to look like replacement.

For `imageCatalog`:

- `state`, each atom in `view`, `run`, and `integrate` have stable atom identity. The setters obtained from `run` and `integrate` remain stable across projection, status, settings, selection, and route changes.
- Stored images change reference only when the accepted canonical projection changes. Prefixes change only with stored images. Filtered and current-page arrays change only with their real projection/filter/page dependencies. Refresh status, cache diagnostics, another key's selection/reservation, and unrelated settings changes preserve all unaffected array references.
- `item(key)` intentionally creates a small derived atom rather than consulting a global registry. A mounted tile owns one instance with `useMemo(() => imageCatalog.item(key), [key])`. That instance is stable until the key changes and is collectible on unmount.
- `item(key)` notifies only when that key's selected/reserved state or access capability changes. A changed usable access capability is a real update even if the key and tile props are unchanged; target mismatch removes the capability and must notify.
- React files may define a module-scope `selectAtom` for one local consumer, including a modal's current stored image, but may not create atoms in render or grow a named selector barrel. No freshly allocated aggregate snapshot or command object belongs in an effect dependency list.

### Committed-render bounds

Render counts use React Profiler commits or a post-settlement subscription counter, not raw function invocations under StrictMode. Initial hydration/StrictMode replay is excluded: mount, drain effects/microtasks/timers, reset the counter, perform one semantic action inside `act`, settle again, then assert the delta. A synchronous Jotai publication may cause at most one commit in a narrow subscriber; a UI interaction that necessarily has both local form/popover state and one Jotai publication may cause at most two commits. Every test also asserts the final visible value so an equality bug cannot “pass” by suppressing all updates.

| Representative subscriber                     | Relevant transition and maximum settled commit delta                                                                                                                                                                                                                           | Unrelated transition and required delta                                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One storage text/switch control               | One user edit: at most two commits (local form state plus the single Jotai publication), one persisted settings write, visible field and `settings.storage.raw` agree. A genuine external profile replacement: at most two commits and the field converges to the replacement. | Upload/gallery/profile metadata/access-status changes that do not change that raw field: **0** field commits and no form rebase.                                                         |
| Upload/gallery settings control               | Its own semantic value change: at most one narrow-subscriber commit after the UI event, with one persistence write.                                                                                                                                                            | Storage raw/access, active-index-only sync projection, catalog status, and selection changes: **0**.                                                                                     |
| Gallery search/filter/sort/page-size control  | One accepted atom change: at most one narrow Jotai commit; the whole user interaction including router acknowledgement/normalization is at most two control commits and one navigation.                                                                                        | Selection, current-page-only updates where the control does not read it, refresh/mutation status, another item's reservation, and natural-size changes: **0**.                           |
| Mounted photo item for key A with fixed props | Selection/reservation/access capability for A: exactly one visible update and at most one commit. Becoming target-mismatched must remove the loaded overlay/source/actions in that commit.                                                                                     | Selection/reservation for key B, refresh-status-only changes, cache diagnostics, and projection changes that preserve A's selected item slice: **0**.                                    |
| Modal toolbar/content for key A               | A's URL/access capability or stored-image value changes, rename remaps A, deletion removes A: at most one relevant commit and the action/source/not-found state updates.                                                                                                       | Selection/reservation for B, unrelated image updates, refresh-status-only changes, and settings branches that preserve A's access capability: **0** toolbar/action commits.              |
| Pending-upload preview/control for child A    | One child snapshot transition: at most one preview commit. Entering processing/uploading closes an open editor and disables edit in that same settled transition; returning to an editable state produces at most one further commit.                                          | A transition of child B and unrelated catalog/view/profile-metadata changes: **0** commits for A. A queue aggregate control may commit once only when its aggregate value truly changes. |

The numeric bounds are regression alarms, not permission to introduce a second subscription just because the total remains below the ceiling. In particular, the rejected upload preview's selector plus manual subscription for the same `canEdit` fact must not be copied; derive close/visibility from one subscribed fact or one focused effect.

### Effect, SSR, Suspense, StrictMode, and cleanup settling

- Constructing/reading settings or catalog atoms is pure with respect to remote IO. Server rendering and a suspended render that never commits cause zero actor starts, adapter constructions, remote calls, browser-storage writes, navigation, timers, observers, and subscriptions. Preserve the base atom storage's commit-time hydration semantics rather than replacing it with render-time hydration.
- The upload workflow module creates one inert actor. Its committed owner above the route calls `mount()`. Deferred final release makes StrictMode setup/cleanup/setup settle to exactly one actor start and no intermediate stop; actual final root/module disposal stops that owned actor and its children exactly once. It never stops an injected external actor.
- Mounting/unmounting the upload route or any queue reader only subscribes/unsubscribes. It neither starts nor stops the actor. Remount observes the same queue actor and pending child identities, including in-flight work, and does not repeat processing or put calls.
- The catalog has no actor activation/provider lifecycle. Its React effects invoke stable Jotai commands only after commit. StrictMode replay joins identical refresh/probe work rather than relying on effect timing to avoid duplicates.
- Every effect/subscription/`ResizeObserver`/animation frame/listener added or touched has a symmetric, idempotent cleanup. A completion after component unmount may settle its caller promise but cannot set component state, navigate, toast, or write Jotai through that unmounted edge.
- After the tested UI reaches its expected state, drain at least ten microtasks plus relevant fake timers and assert that render, navigation, persistence, adapter, remote, actor-start, and actor-stop counts remain unchanged. This is the settling check for hidden loops.

### URL hydration and serialization contract

URL shape and ownership remain entirely in React/router code. The catalog only exposes passive `view.filter`, `view.page`, and `view.pageSize` data. Use a canonical semantic route value consisting of normalized search, prefix/date filters, sort, and page size. Object identity and search-key order are never change signals. Selection and current page are never serialized.

The route edge obeys these rules:

1. Direct load parses the current location and batch-applies a semantic change once. It resets/clamps current page once and leaves selection untouched. A canonical URL navigates zero times; invalid, default-filled, or noncanonical input causes exactly one `replace`, never a push.
2. One semantic user edit publishes the view once, resets/clamps current page once where main behavior requires it, and performs at most one outward navigation. The router acknowledgement of the same canonical target clears the pending origin marker; it does not hydrate again and does not navigate again.
3. Each distinct external back/forward location is authoritative and hydrates once, with at most one canonicalizing `replace`. It never produces an outward push. Two route objects that normalize to the same semantic value cause zero writes and zero navigation.
4. If an external location arrives while a user-originated navigation is pending, the external location wins and invalidates the stale pending target. A late acknowledgement of the invalidated target cannot overwrite the newer route/Jotai state. If multiple external locations are committed rapidly, only committed locations may hydrate and the final committed location must be visible; no stale closure may reapply an earlier one.
5. Opening a modal captures the exact canonical gallery search. Back, Escape, successful delete, and successful rename return/navigate using that captured gallery state, not a closure over later unrelated catalog/settings state.

Tests cover direct load, already-canonical load, invalid/default normalization, one outward edit, router acknowledgement, serial back/forward, rapid user-edit/external-navigation interleaving, two rapid external changes, and semantically equal objects with different key order. Each case asserts both the final Jotai/DOM value and exact hydrate/navigation counts under StrictMode.

### Exact adapter, remote, and local-write counts

Use one counted `createStorage` seam shared by settings, catalog, and upload. Unless a row explicitly joins work, one valid storage-bearing command constructs one adapter at command/IO start and makes exactly one named remote call. There are no automatic retries.

| Trigger                                                                                                          |  `createStorage` | Remote calls                                                                                            |
| ---------------------------------------------------------------------------------------------------------------- | ---------------: | ------------------------------------------------------------------------------------------------------- |
| Invalid settings: access test, refresh, probe, download, URL/markdown, delete, rename, or upload attempt         |            **0** | **0** of every kind                                                                                     |
| Target-mismatched catalog projection: probe, download, URL/markdown, delete, or rename                           |            **0** | **0**; explicit refresh is the only allowed rebinding operation                                         |
| Valid settings access test                                                                                       |            **1** | `checkAccess` **1**                                                                                     |
| One nonjoined foreground/background refresh                                                                      |            **1** | `listStoredImages` **1**                                                                                |
| N concurrent refresh intents in one generation, including StrictMode replay and background-to-foreground upgrade |      **1 total** | `listStoredImages` **1 total**; every caller receives the same promise                                  |
| One usable URL or markdown request                                                                               |            **0** | **0**; validate target safety, then derive text locally                                                 |
| One nonjoined probe / download                                                                                   |    **1** / **1** | matching operation **1** / **1**                                                                        |
| N identical concurrent probes for key + operation context                                                        |      **1 total** | `probeStoredImage` **1 total**; the record disappears on settlement                                     |
| One canonical delete / rename command                                                                            |    **1** / **1** | one batched `deleteStoredImages` / one `renameStoredImage`                                              |
| Identical active command ID + canonical input                                                                    | **0 additional** | **0 additional**, same promise                                                                          |
| Overlapping keys or command-ID conflict                                                                          | **0 additional** | **0 additional**                                                                                        |
| Two disjoint mutations                                                                                           |      **2 total** | one matching call for each; they may overlap in time                                                    |
| One pending-upload attempt                                                                                       |            **1** | `putStoredImage` **1**; processing is counted separately and is not repeated by route/StrictMode replay |

Additional exact assertions:

- A structurally equal settings write produces zero persistence writes. One real ordinary edit produces one settings-envelope write, zero catalog-cache/natural-size clears, zero adapter constructions, and zero lists.
- One genuine profile replacement produces at most one settings-envelope write, exactly one catalog reset/cache `[]` write, exactly one natural-size clear, and one replacement integration. Once scheduling settles, it produces exactly one background list if the new profile is valid and refresh-eligible, otherwise zero; any already-active eligible refresh is joined rather than duplicated.
- Initial stale+valid+auto-refresh, invalid-to-valid, and auto-refresh false-to-true are eligibility edges. Each edge schedules/joins one list. Valid-to-valid storage edits, selection/view changes, status changes, raw invalid keystrokes, access-test status, and render churn schedule zero lists.
- A confirmed upload/delete/rename or uncertain terminal mutation takes exactly one reconciliation slot. With no suitable list active, scheduler flush causes one list; with a suitable list active, it joins/replays into that one and creates zero additional lists. `already-exists`, invalid, target mismatch, keys-busy, command conflict, duplicate upload fact, and superseded work schedule zero.
- An accepted listing or confirmed fact performs one catalog-cache write. A failed refresh performs zero projection/cache writes and preserves the last-good array reference. Cache-write failure records one diagnostic without a rollback write or remote retry.

### Stale closures and completion acceptance

All storage commands read `settings.storage` at invocation/IO start. React passes intent, keys, files, or UI data only; parsed settings, target ID, generation, and numeric revision are not captured in event props or effect dependencies.

Deterministic deferred tests must cover completion both before and after a relevant settings edit/profile replacement:

- access test completion publishes only if its private request token and storage revision remain current; a revision change immediately returns visible access state to idle;
- refresh/delete/rename completion writes only when generation and required operation context remain current; old completion returns `superseded` and does not change projection, selection, status, cache, feedback, or reconciliation counts;
- upload captures generation/settings revision when put begins; obsolete completion becomes `superseded`, does not call `integrate`, and does not mark the queue/catalog as uploaded;
- probe completion publishes MIME only for the still-mounted key and same usable access capability; old-capability or unmounted completion is ignored; and
- a late URL navigation acknowledgement cannot overwrite a newer external location.

Tests must exercise both completion orders for a listing versus confirmed upload/delete/rename. The final projection, selection, cache payload, and call counts must agree in both orders.

### Mounted settings-form replacement decision

The base/main S3 form feeds reactive atom data into the form library as `defaultValues`, but existing tests cover only initial values and user edits; they do not prove a mounted form follows an external active-profile/sync replacement. Treat this as a missing-reactivity characterization gap, not as permission to rewrite the form.

The required behavior is:

- a true `profileReplaced: true` transition rebases every mounted settings form to the newly active raw settings exactly once;
- the visible controls, form state, validation branch, and persisted active profile converge to the replacement before settlement;
- rebasing suppresses the form's outward change listener so it cannot write an old draft back, cause a second profile replacement, reset caches twice, list, or persist duplicate data;
- ordinary field edits, access-status changes, profile rename/duplicate/inactive import, structurally equal sync/import, and already-active load do not rebase the form; and
- no broad “sync atom into form on every render” effect is allowed. If the form library does not react to changed defaults, use the smallest settings-internal replacement epoch/key/reset edge, scoped only to true replacement.

The contract test mounts the form, gives it an in-progress invalid visible edit, performs profile replacement through the production composition write atom, and asserts the new values win once with the exact persistence/reset/list counts above. It also proves an ordinary external no-op does not erase the user's current field state.

### Mounted photo-probe decision

Preserve the base's positive reactivity while adding target safety:

- A mounted error tile starts one probe when it first receives a usable access capability.
- A semantically changed same-target validated storage context produces a new capability and starts one new probe even though the key and component remain mounted. This includes a credential/region/path-style/public-URL revision that the settings contract considers semantically changed. Identical in-flight key + capability requests join, including StrictMode replay.
- Invalid settings or a target mismatch removes the capability, cancels the tile's authority to publish an older result, removes loaded overlay/source/actions, and performs zero adapter/remote work. A target change does **not** probe the new target before an explicit successful refresh binds the projection.
- If the explicit refresh restores a usable capability while the tile is still in its error state, it probes once for that new capability.
- Manual Refresh invokes the same joined command. An old or post-unmount completion cannot change MIME.

The required test sequence asserts the visible MIME/error state as well as exact adapter/probe counts for mount, StrictMode replay, same-target revision change, target mismatch, explicit rebind, manual join, and unmount. This directly closes the missed-update hole in `2664318`, whose probe effect depended only on stable key/runtime identity.

### Slice acceptance and deletion review

Each implementation slice ends with this review, before the next slice begins:

1. Run the preserved base/main behavior tests plus the slice's positive/negative subscriber matrix, identity checks, committed-render bounds, settling checks, exact adapter/remote/local-write counts, and relevant deferred completion orders.
2. Review every changed `useEffect`, `useLayoutEffect`, subscription, atom `onMount`, `useMemo`, and `useCallback` line-by-line. For each, name the transition that changes every dependency and the transition that must leave it stable.
3. Search for all writers and IO execution edges. There must be one canonical catalog projection writer, one profile-replacement composition write, one refresh execution edge, one route synchronization owner, and one upload actor owner. A React component must not merge listings, parse settings for commands, build adapters, or reconcile facts.
4. Search for old imports and symbols after cutover. Delete the old implementation in the same slice: all listing callers move together before `useFetchPhotoList` is removed; each photo command hook is removed when its caller moves to `run`; direct writable image-list and dirty/reset exports disappear after `integrate` owns their facts. No alias or forwarding hook remains.
5. Inspect exported surfaces and standalone types. The settings and catalog surfaces still have five interaction points each; no selector/command family, registry, runtime container, event facade, provider stack, or type-first scaffolding has appeared.
6. Verify no module-global per-key/per-operation registry grows after mount/unmount cycles. Keyed item atoms are component-owned and collectible; active command/probe records disappear on settlement.
7. Review the diff against the protected path list. Unrelated atoms/effects/UI stay byte-for-byte or mechanically equivalent. If their behavior changed, the slice is rejected or split and must repeat the burden-of-proof process.

Dormant pure reducer/schema code may land before its cutover only when it has no exported React facade, atom subscription, provider, timer, persistence, or IO edge. Dormant reactive code may not land: it creates an unreviewed second authority even if no UI currently renders it. Temporary compatibility paths are not an accepted rollout technique.

This contract deliberately authorizes focused tests and focused edits, not a mass Jotai rewrite. It closes a slice only when both “the right subscriber did update” and “nothing else woke up” are demonstrated through the public five-interaction settings/catalog seams.
