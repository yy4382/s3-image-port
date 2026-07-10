# Choose reactivity-safe reapplication slices

Type: grilling
Status: resolved
Blocked by: 02, 04, 05, 06, 07

## Question

How should implementation be sliced from `88bda7e` so useful behavior and pure logic are reapplied without cherry-picking mixed commits, globally replacing Jotai atoms, introducing temporary dual authorities, or obscuring reactivity regressions behind a massive cutover?

Resolve an ordered set of reviewable slices with dependency edges, rollback boundaries, dormant-code rules, compatibility/deletion policy, and verification gates. The sequence must cover the lifecycle seam, settings semantics, catalog contract/reconciliation, gallery URL/actions, upload lifetime/catalog notification, profile/sync/natural-size wiring, the independent switch/measurement/`.gitignore` fixes, and final deletion/review.

For every slice, name the protected behavior, which reactive seams may change, deterministic tests required before and after, remote-call-count/race cases, and the proof that no thin wrapper, duplicate authority, oversized module interface, or type-first scaffolding remains. Keep implementation work outside this ticket.

## Comments

- The user explicitly delegated this decision to the agent and instructed it not to run a HITL grilling exchange. Resolve autonomously from the accepted map decisions and repository evidence.

## Answer

Implement from `88bda7e` as ten reviewable slices. Never cherry-pick `72d9848` or `2664318`; use them only to recover individual rules and tests. `main` at `72e942667f2fe31b047dae663e4f5484964983c4` remains the ordinary UI oracle, with only the eight accepted corrections in [the reapplication inventory](../assets/01-reapplication-reactivity-inventory.md) allowed to differ.

The sequence deliberately has one broad slice: **Cut over the deep image catalog authority**. Refresh, mutations, projection writes, cache writes, item access, and confirmed-fact reconciliation cannot be split into separately active production paths without temporarily dividing catalog ownership. Its rollback is one version-control revert that restores the deleted base implementation. There is no runtime flag, shadow catalog, compatibility facade, dormant old provider, or dual write.

### Dependency graph and parallel frontier

| Order | Slice                                                            | Blocked by                                                                                                                                                                 | May run in parallel with                                                                                                            |
| ----- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Establish the behavioral baseline and deterministic harness      | —                                                                                                                                                                          | —                                                                                                                                   |
| 2     | Pin and codify the Jotai-XState lifecycle contract               | Establish the behavioral baseline and deterministic harness                                                                                                                | Deepen settings in place; Extract the pure catalog kernel; Apply independent fixes                                                  |
| 3     | Deepen settings in place                                         | Establish the behavioral baseline and deterministic harness                                                                                                                | Pin and codify the Jotai-XState lifecycle contract; Extract the pure catalog kernel; Apply independent fixes                        |
| 4     | Extract the pure catalog kernel                                  | Establish the behavioral baseline and deterministic harness                                                                                                                | Pin and codify the Jotai-XState lifecycle contract; Deepen settings in place; Apply independent fixes                               |
| 5     | Cut over the deep image catalog authority                        | Deepen settings in place; Extract the pure catalog kernel                                                                                                                  | —                                                                                                                                   |
| 6     | Correct the React-owned gallery URL edge                         | Cut over the deep image catalog authority                                                                                                                                  | Move upload ownership above the route; Close profile replacement, sync, form, and natural-size behavior                             |
| 7     | Move upload ownership above the route                            | Pin and codify the Jotai-XState lifecycle contract; Deepen settings in place; Cut over the deep image catalog authority                                                    | Correct the React-owned gallery URL edge; Close profile replacement, sync, form, and natural-size behavior                          |
| 8     | Close profile replacement, sync, form, and natural-size behavior | Deepen settings in place; Cut over the deep image catalog authority                                                                                                        | Correct the React-owned gallery URL edge; Move upload ownership above the route                                                     |
| 9     | Apply independent switch, measurement, and ignore fixes          | Establish the behavioral baseline and deterministic harness                                                                                                                | Any pre-final slice; merge the measurement cleanup before or after, not concurrently with, the catalog slice's `PhotoGrid.tsx` edit |
| 10    | Run deletion proofs and final reactivity review                  | Correct the React-owned gallery URL edge; Move upload ownership above the route; Close profile replacement, sync, form, and natural-size behavior; Apply independent fixes | —                                                                                                                                   |

This is a dependency order, not a demand for ten serial agents. After the baseline, the lifecycle, settings, pure-catalog, and independent-fix lanes are takeable together. After the catalog cutover, URL, upload, and profile-replacement closeout are takeable together as long as their file edits do not overlap.

### Rules that apply to every slice

1. **Red and green stay in one slice.** For an accepted correction, first demonstrate its focused test failing against the preceding slice, then land the implementation and green test together. Do not merge skipped or expected-failing tests. For preserved behavior, add or retain a passing base/main characterization before editing its path.
2. **One authority at every commit boundary.** A new writer, IO edge, actor owner, or route owner becomes callable only in the same slice that removes the old callable path. A pure reducer/schema may land early only under the dormant-code rule below.
3. **Reactive edits carry paired evidence.** Every changed atom, `useEffect`, `useLayoutEffect`, atom `onMount`, subscription, `useMemo`, or `useCallback` names one positive transition that must update and one negative transition that must not. Assert the final visible value as well as the committed-render/subscription delta, then drain at least ten microtasks and relevant fake timers and assert no continuing renders, navigation, persistence, adapter construction, remote calls, actor starts, or actor stops.
4. **The public surfaces remain fixed.** Settings has only `profiles`, `storage`, `upload`, `gallery`, and `replaceProfile`. The catalog has only `state`, `view`, `item(key)`, `run`, and `integrate`. Tests may construct those modules with adapters, but production and tests cross the same interface. A local consuming React file may define one module-scope `selectAtom`; neither module may grow a selector/hook family.
5. **Inference comes from implementation and schemas.** Continue to infer core values from the existing Zod schemas. Implement functions/reducers first and infer their parameters/returns contextually. A small explicit discriminated outcome at a real seam is allowed. A preliminary inventory of contexts, events, snapshots, commands, interfaces, and aliases is a failed review.
6. **Delete replaced paths in the cutover slice.** Do not leave forwarding hooks, deprecated exports, adapters that preserve old call shapes, aliases, dormant providers, a second writable image array, or a second parsed-settings projection for a later cleanup ticket.
7. **Persisted formats do not change.** Keep `s3ip:profiles-list`, its versioned envelope/migrations, `s3ip:gallery:photos` as a bare `StoredImage[]`, and the natural-size key/payload. This makes each rollback a normal revert instead of a data migration.
8. **Run the proportional repository gate.** Each slice runs its focused tests plus the preserved base suites it touches, then `pnpm --dir apps/web test --run`, `pnpm --dir apps/web build`, and `pnpm --dir apps/web lint`. If the repository's final scripts differ at implementation time, use their exact equivalents and record them; do not silently skip a gate.

### Dormant-code and compatibility policy

The only dormant production-shaped code allowed before a cutover is the pure catalog kernel in **Extract the pure catalog kernel**: Zod schemas, pure cache parsing/serialization, canonicalization, and the projection/reconciliation reducer. It may have direct unit tests, but it has no atom, actor, React export, provider, subscription, timer, browser-storage write, adapter construction, or remote edge.

Dormant reactive/workflow code is forbidden. Do not land an inactive settings module, inactive catalog atom graph, alternate queue actor, unused provider, or second route synchronizer for later activation. Do not use a compatibility facade to migrate callers gradually. Existing base code may remain the sole active authority until its owning cutover; it is deleted when the replacement becomes active.

The profile-replacement composition write is the one intentional seam whose implementation target evolves. In **Deepen settings in place**, it calls the currently authoritative base gallery reset exactly once. In **Cut over the deep image catalog authority**, that same write changes its one catalog target to `imageCatalog.integrate` and the base reset atom is deleted in the same diff. At no point do both reset paths run.

## Slice 1: Establish the behavioral baseline and deterministic harness

**Protected behavior.** Freeze the preserved settings migration/profile/form behavior, gallery derivation and action behavior, URL/modal behavior, upload queue/child behavior, sync confirmation/conflict behavior, and cache payloads before production ownership changes. Record the eight accepted corrections as the only planned deviations; do not make the base's excess listing, route-local upload lifetime, whole-selection rerenders, or unsafe old-target actions into desirable characterizations.

**Allowed reactive changes.** None. This slice adds tests and reusable test controls only.

**Before/after gates.** Record the unmodified `88bda7e` results for the existing `atomWithStorageMigration`, settings atom/profile/S3 form, `use-photo-list`, photo actions, upload machine/UI, sync, gallery route/modal, and natural-size suites. Add small deterministic helpers for counted `createStorage`, per-operation counts/arguments, deferred promises, controllable browser-storage reads/writes/failures, stable IDs, StrictMode mounting, post-settlement subscription/commit counts, and observer/animation-frame cleanup. Recover the behavior of useful helpers at `2664318`, but simplify their type annotations rather than copying their type inventories.

**IO and race evidence.** The helpers must distinguish adapter construction from each remote method; allow list/fact and mutation completion in either order; expose persistence writes separately from remote calls; and prove that ten drained microtasks do not change any counter. No live S3 request occurs.

**Depth/deletion proof.** Test controls are functions and fixtures, not a runtime object exposed to production. There is no generic effect bag or application harness that production imports.

**Rollback.** Revert test-only files. No persisted data or production path changes.

## Slice 2: Pin and codify the Jotai-XState lifecycle contract

**Protected behavior.** Establish the exact library contract before touching upload ownership. Add and pin `jotai-xstate` `0.6.1` in `apps/web/package.json` and `pnpm-lock.yaml`; do not add `@xstate/store` or `@xstate/store-react` and do not remove Jotai or Jotai optics.

**Allowed reactive changes.** None in production. Promote the isolated [lifecycle spike](../assets/02-lifecycle-spike/lifecycle.test.tsx) into a repository compatibility test or an equivalently focused installed-dependency test. It must retain the source-audited distinction between default `atomWithActor` and externally owned `atomWithActorSnapshot`.

**Before/after gates.** The eleven spike cases pass at the pinned versions: vanilla read, SSR, suspended never-commit render, StrictMode, reader remount, second Jotai store, `autoStart: false`, external snapshot actor, immediate stop/start, deferred final release, and initialization getter versus command-time store read. The selected pattern proves zero actor starts for SSR and abandoned Suspense, one start through StrictMode replay, and one stop on actual final release.

**IO and race evidence.** Actor-start/stop counters are exact. The test actor must not construct storage or perform remote IO. No production actor module lands dormant here; its first production instantiation belongs to **Move upload ownership above the route**.

**Depth/deletion proof.** The dependency test exposes no wrapper library, generic actor factory, provider, or lifecycle facade. The later upload module will use `atomWithActorSnapshot` directly.

**Rollback.** Revert the compatibility test, manifest entry, and lockfile change together.

## Slice 3: Deepen settings in place

**Protected behavior.** Preserve the storage key/envelope, migrations and cleanup, defaults, profile order/current-index behavior, v1/current import and export, sync-format payload, focused upload/gallery edits, forms, toasts/confirmations, and React Query sync workflow. Add the accepted semantic no-op, stable projection, command-time access-test, typed profile outcome, storage revision, and genuine profile-replacement classification behavior.

**Cutover.** Evolve the existing `atomWithStorageMigration` root and focused optics atoms into one constructed/singleton `settings` value with exactly:

```text
profiles  storage  upload  gallery  replaceProfile
```

Move all settings callers in the same slice. `settings.upload` and `settings.gallery` remain the existing focused atom instances or direct evolutions; they are not copied through synchronization effects. `settings.storage` owns raw state, stable Zod validation/errors, revision/target identity, and access-test status/command. `settings.profiles` owns ordinary profile operations and the independently stable sync projection. `settings.replaceProfile` owns only settings replacement/classification. The external composition write becomes the sole production caller for replacement-capable load/import/sync actions and, until the catalog cutover, invokes the existing gallery reset as the one current reset authority.

Make `optionsAtom`, `s3SettingsAtom`, `validS3SettingsAtom`, `settingsForSyncAtom`, and direct profiles setters private once their final callers move. Do not leave aliases or `useSettings*` hooks. Existing catalog/upload code may read `get(settings.storage)` or use its valid branch while those owners are still the base paths; do not add a second parsed-settings atom. The S3 form's existing dirty/list trigger remains untouched until catalog ownership changes, because changing it here would split one reactive correction across two slices.

**Reactive seams and paired tests.** A storage field edit must update its visible control and `settings.storage.raw`; upload/gallery/profile metadata/access-status changes must not rebase or rerender that field. Upload/gallery controls update for their own value and not storage/access/current-index-only changes. Stable projection tests assert `===` for unaffected raw, validation, parsed settings, target ID, profiles envelope, sync payload, upload, and gallery values. A structurally equal write performs no notification or persistence. The existing form listener and storage hydration/migration `onMount` remain otherwise mechanically equivalent.

**Behavior and IO gates.** Retain the base migration/profile/form/sync suites and port the useful settings contract scenarios: invalid access test constructs zero adapters and performs zero `checkAccess`; a valid test constructs one adapter and calls `checkAccess` once; CORS details survive; a storage revision change resets access to idle and rejects a late result; upload/gallery/inactive-profile changes do not cancel it. Profile operations preserve ordering and typed rejection outcomes. Equal sync/import and already-active load report no replacement. A genuine replacement persists at most once and invokes the one composition reset once.

**Race gates.** Resolve an access test before and after a storage edit and prove only the current token/revision publishes. Resolve an old-store request after a second Jotai store has been created and prove store isolation. No completion may toast or write through an unmounted React edge.

**Depth/deletion proof.** Tests use the five atoms, not private atoms. The production value is inferred from its creator. There is no settings context/provider, selector barrel, command object, dispose method, persistence adapter export, or front-loaded alias block. Repository search finds no old public settings atom import after the slice.

**Rollback.** Revert this slice as one unit. The persisted envelope is unchanged, so the base settings atoms can read it again. The existing gallery is still the sole catalog authority at this boundary.

## Slice 4: Extract the pure catalog kernel

**Protected behavior.** Isolate only the reusable catalog rules before the production cutover: cache classification, canonical delete/rename inputs, stored-image projection changes, listing start revision, confirmed upload/delete/rename facts, rename ordering, fact replay/pruning, and generation reset.

**Allowed reactive changes.** None. Do not create `imageCatalog`, atoms, an actor, a cache writer, scheduler, request registry, provider, or React exports in this slice.

**Before/after gates.** Port the scenario value—not the type-first implementation—from `image-catalog-projection.test.ts` and `image-catalog-cache.test.ts`. Tests cover absent/malformed/cached-empty/listed-empty cache classification; unchanged bare `StoredImage[]` serialization; upload/delete/rename application; rename destination replacement at the source position; listing-before-fact and fact-before-listing for all three fact kinds; pruning only after no active listing needs a fact; semantic no-op identity; profile reset; and cache-write-error result construction without pretending an in-memory rollback occurred.

**IO and race evidence.** Tests pass explicit values and deferred ordering but call no browser storage and no image-storage adapter. The reducer produces the same final projection in both completion orders.

**Depth/deletion proof.** Core stored-image/fact data is defined by colocated Zod schemas and inferred. Helper functions remain private to the kernel unless the eventual owning module genuinely needs them. Do not copy the preliminary type blocks or internal machine event vocabulary from `2664318`.

**Rollback.** Delete the pure files and tests. No production caller exists.

## Slice 5: Cut over the deep image catalog authority

**Protected behavior and accepted corrections.** Preserve the base filter/search/Fuse ordering/sort/pagination/page-size/shift-selection, layout, loading/toast/dialog, photo modal, and last-good UI. In this slice implement known-empty versus unloaded cache state, one joined refresh, target mismatch safety, stale completion rejection, keyed locality, immediate confirmed facts, mutation reservations, both-order reconciliation, and zero automatic list on ordinary storage edits.

**Atomic cutover.** Build the final deep Jotai/plain module and move every catalog caller in this slice:

```text
state  view  item(key)  run  integrate
```

Retain the base filter/page/page-size/selection atoms and derivations as the implementation of `view` with the smallest possible edits. Deepen only the canonical projection representation. `state` is the stable observable read model. `item(key)` creates a collectible component-owned derived atom with no `atomFamily` or module-global map. `run` owns refresh, delete, rename, probe, download, URL, and markdown safety/IO. `integrate` accepts only confirmed upload and profile-replacement facts. The pure kernel from the prior slice becomes the only projection reducer.

Move `Gallery`, `PhotoGrid`, controls, selection, `PhotoItem`, overlay/options, modal, and photo-action call sites directly to these interactions. UI retains clipboard, anchor, translation, toast, confirmation, and navigation work; it does not wrap each command in another exported hook. Keep the current React/router URL effects semantically unchanged here except for mechanical imports; URL correction is the next focused slice.

Move all listing callers together to `run("refresh", ...)`, keep one `Gallery` post-commit effect driven only by catalog-derived eligibility and the stable `run` setter, and delete `useFetchPhotoList`, direct writable `photosAtom`, dirty status/setters, and the old list execution edge. Move delete/rename/probe/download/copy together to `run` and delete the old per-command storage hooks. Change the existing profile-replacement composition write's one catalog target to `integrate("profile-replaced")`, then delete the old gallery reset atom. There is no dormant copy of the old catalog.

**Reactive seams and paired tests.** The authorized changes are the projection atom, catalog view imports, `Gallery` eligibility effect, keyed selection/access subscription in `PhotoItem`, and modal/action reads. Prove:

- a real listing/fact/filter/page change updates the relevant subscriber once, while refresh status, diagnostics, other-key selection/reservation, access status, and unrelated settings preserve unaffected array/subscriber identity;
- `item("A")` updates for A selection/reservation/access-capability changes and target mismatch, but receives zero commits for B changes;
- a mounted error tile probes once on first usable capability and once on a semantically changed same-target capability, while StrictMode replay/manual identical work joins; mismatch removes the loaded source/overlay/actions and performs zero IO until explicit refresh rebinds;
- modal A updates for A removal/rename/access changes and not B reservation/selection/status changes; and
- the existing view atoms still reset/clamp pages and implement shift selection as characterized. The URL effects receive only mechanical atom import changes in this slice.

**Exact IO gates.** Use the counted `createStorage` seam and assert:

- invalid settings: zero adapter creation and zero calls for refresh/probe/download/delete/rename; target mismatch: zero calls for every target-dependent operation except explicit refresh;
- one nonjoined refresh: one adapter and one list; any concurrent/StrictMode intents in one generation: one total adapter/list and the same promise, with foreground upgrading background;
- URL/markdown: zero adapter and zero remote calls after local safety validation;
- one probe/download/delete/rename: one adapter and one matching remote call; identical concurrent probes join once;
- same command ID plus identical canonical input joins with zero additional work; overlap or ID conflict rejects with zero additional work; disjoint mutations each make their one call; and
- one accepted listing or fact makes one cache write; failed refresh makes none and preserves the last-good array reference; cache failure records one diagnostic and no rollback/retry.

**Race and outcome gates.** Exercise both orders of listing versus confirmed upload, delete, and rename. Test disjoint mutation completion in both orders, overlapping-key rejection, reservation cleanup, `already-exists`, partial rename, uncertain delete failure, command-ID conflict, profile replacement during every operation, and late completion after generation/revision change. Old work returns `superseded` without changing projection, selection, cache, status, feedback, or reconciliation count. An accepted/uncertain fact takes exactly one reconciliation slot; duplicate/stale/invalid/mismatched/busy/conflicting facts take none.

**UI/behavior gates.** Manual and empty-state refresh retain loading/disabled/toast behavior; background success stays silent and failure observable; failures retain last-good images; delete clears requested selection on terminal outcome; confirmed rename remaps selection; target mismatch shows last-good thumbnails without usable source/actions; successful explicit refresh binds the new target. Ordinary valid-to-valid storage edits, invalid keystrokes, view/selection/status churn, and access-test changes cause zero lists. One genuine profile replacement immediately clears projection/view/selection, persists cache `[]` once, and allows exactly one eligible background list; ordinary edits clear nothing.

**Depth/deletion proof.** Repository search shows one projection writer/reducer, one list execution edge, one cache writer, one profile-reset composition write, and no React adapter construction or reconciliation. The public object has five interactions; no named selector collection, event facade, command hooks, lifecycle methods, provider, actor, global per-key map, or type inventory exists. Active probe/command records are unexported per-Jotai-store atoms and disappear on settlement.

**Rollback.** This is one atomic version-control boundary. Revert the whole slice to restore the deleted base atoms/hooks and their callers. Never partially revert one command path and never retain the old path dormant as a runtime rollback mechanism.

## Slice 6: Correct the React-owned gallery URL edge

**Protected behavior.** URL parsing, normalization, serialization, history, and the choice of URL-backed fields remain entirely in `DisplayControl`/router-side React code. The catalog exposes passive `view.filter`, `view.page`, and `view.pageSize` atoms only and must not import route/search types. Selection and current page stay out of the URL; modal return keeps the exact search captured at open.

**Focused reactive change.** Keep the existing route edge in its current React module. Replace only its equality/origin coordination: compare canonical semantic route values, not object identity or search-key order; route-to-Jotai hydration writes only when semantics differ; Jotai-to-route navigation skips a matching committed route or matching pending target; a committed external location invalidates any older pending user target. Do not copy the rejected large `use-gallery-route-sync` effect, export a route command facade, or move URL state into the catalog.

**Before/after gates.** First characterize already-canonical direct load, existing normalization, page reset, and back/forward. Add red cases for rapid user edit followed by external navigation, a late acknowledgement of the invalidated user target, two rapid committed external locations, and semantically equal search objects with different key order. After the patch, assert exact final DOM/Jotai state and counts under StrictMode:

- canonical direct load: one hydration decision, zero writes when already equal, zero navigation;
- invalid/default/noncanonical direct load: one semantic hydration and exactly one `replace`;
- one user semantic edit: one Jotai publication, current-page reset/clamp once, at most one push, and zero acknowledgement echo;
- every distinct external back/forward location: one hydration, at most one canonicalizing replace, never a push; and
- external state wins every pending interleaving; a stale acknowledgement performs zero writes/navigation.

Modal back, Escape, successful delete, and successful rename use the captured gallery search. Selection remains unchanged by hydration.

**IO and settling gates.** Every route case causes zero storage adapter construction, remote calls, cache writes, and actor activity. After settlement, navigation, render, and atom-write counters remain unchanged through the microtask/timer drain.

**Depth/deletion proof.** Delete superseded coordination refs/effect code in this slice. Any pure canonicalization helper stays module-local or with the existing URL schemas; no exported hook family or second route owner appears.

**Rollback.** Revert the route React/tests only; catalog data and persisted payloads are unaffected.

## Slice 7: Move upload ownership above the route

**Protected behavior and accepted corrections.** Preserve the base queue/pending-child machines, compression, add/process/upload-all/retry/remove/clear behavior, previews, and messages. Change only lifetime ownership, command-time storage reads, stale upload acceptance, immediate catalog notification, and edit locking.

**Cutover.** Use the pinned lifecycle seam to create one inert upload actor per owning root/Jotai store, observe it with `atomWithActorSnapshot`, and expose one writable queue atom plus the internal/root-only `mount()` cleanup proven by the spike. The focused owner mounts inside the existing single Jotai provider and above `<Outlet>`. It starts after commit, defers a zero-owner stop across StrictMode replay, stops only the actor it created on actual final disposal, and relies on the actor system to stop children. Upload-route readers never start or stop it.

Remove the route-local `UploadQueueProvider`, its selector/command hook family, and parsed-settings upload event payloads in the same slice. React sends queue intent/files only. The upload operation reads `settings.storage` plus profile generation/revision from the owning Jotai store when put IO actually begins, after any required processing. Its successful result contains the returned `StoredImage`, upload ID, and captured generation/revision and calls `imageCatalog.integrate` once. Keep the injected implementation narrow—conceptually process, upload, and confirmed-upload behavior—not a `PendingUploadEffects`/runtime grab bag.

**Reactive seams and paired tests.** The root gains only the focused committed owner; the Jotai provider remains single. `Upload` loses its provider and reads/sends through the one queue atom. A pending preview subscribes once to its child fact; entering processing/uploading closes and disables editing in the same settled transition, and the machine rejects impossible edit events. Do not copy the rejected selector-plus-manual-subscription duplication. Child A commits at most once for A's transition and zero times for B/catalog/view/profile-metadata changes; the aggregate control commits only when its aggregate value changes.

**Lifecycle and IO gates.** SSR and abandoned Suspense produce zero actor starts, processing, adapter creation, puts, catalog integration, or subscriptions. StrictMode settles to one actor start and no intermediate stop. Route unmount/remount preserves actor identity, child identity/state, and in-flight work and repeats neither processing nor put. Final root disposal stops the owned actor/children exactly once; an injected external actor is not stopped.

Each valid upload attempt constructs one adapter and calls `putStoredImage` once. Invalid settings produce zero adapter/put. Settings changed before IO begins are the values used. Completion after profile generation/storage revision changes returns `superseded`, does not enter uploaded, and does not call `integrate`. A current completion integrates once, appears in the catalog immediately, and schedules/joins one reconciliation; duplicate notification is idempotent. Retry creates only the explicitly requested next put—there is no automatic retry.

**Depth/deletion proof.** The upload seam has one writable atom for React and one owner-only lifetime operation, not an app-state runtime. There is no queue context facade with selector hooks, no parsed settings in React dependencies/events, no generic DI container, and no new type-first event/context inventory beyond the existing machine's real boundary.

**Rollback.** Revert root ownership, queue atom, machine IO changes, UI imports, and deletion of the route-local provider as one unit. Do not partially restore route ownership while leaving the long-lived actor running.

## Slice 8: Close profile replacement, sync, form, and natural-size behavior

**Protected behavior.** Retain the existing React Query/Jotai sync workflow, confirmations, conflict resolution, token/config persistence, profile UI, and independent LRU natural-size cache. Do not redesign sync as a machine or natural-size state as an actor.

**Focused integration.** Audit every replacement-capable ingress—active profile load, full-envelope import where present, sync pull, and remote-wins conflict—and ensure it calls the one composition write. Ordinary field edits, rename, duplicate, inactive import/edit, already-active load, active-index-preserving equal sync/import, and metadata-only changes must bypass or return `profileReplaced: false`. The composition write performs, in order, the one settings replacement, one generation advance, one `imageCatalog.integrate("profile-replaced")`, and one direct natural-size clear only when replacement is genuine.

Add the smallest form-specific replacement edge required by the red mounted-form test. A true replacement rebases a mounted S3/settings form exactly once and suppresses its outward listener while rebasing. Do not add a broad “copy atom values into form on every render” effect. Prefer the form library's focused reset/replacement operation or a replacement-only epoch/key; ordinary external no-ops and access/profile metadata changes must not erase an in-progress field edit.

**Reactive and persistence gates.** A mounted form with an invalid draft converges once to the new active profile, its validation branch agrees, and no old draft is written back. It stays unchanged for an ordinary no-op. Sync-format identity remains stable for active-index-only change and changes only with list payload. Natural-size notifications/layout update once for a genuine clear and not for ordinary settings, sync config/token, catalog status, or selection changes.

**Exact counts and races.** One genuine replacement makes at most one settings-envelope write, exactly one catalog reset/cache `[]` write, exactly one natural-size clear, and one replacement integration. It schedules/joins exactly one background list when the replacement is valid and eligible, otherwise zero. Structurally equal sync/import makes zero settings/cache/natural-size writes and zero lists. Complete old access/list/delete/rename/upload/probe work after replacement and prove none can repopulate state or publish stale form/UI feedback.

**Depth/deletion proof.** The composition write is the only cross-module reset. Sync consumes the stable nested value from `settings.profiles` (a consumer-local module-scope selector is allowed) and contains no catalog/cache knowledge. Natural-size remains its existing Jotai/plain module; retain current debounce/onUnmount persistence behavior and do not add a new unload/flush policy in this effort. Search finds no direct replacement setter or reset call outside the composition write.

**Rollback.** Revert replacement callers, focused form rebase, and natural-size integration together. Persisted formats remain readable; do not partially revert one ingress and create inconsistent replacement semantics.

## Slice 9: Apply independent switch, measurement, and ignore fixes

**Protected behavior.** These changes are independent of state architecture and must remain small:

- default the animated Base UI switch's existing `nativeButton` prop to `true` and retain the warning regression test;
- in the existing atom-based `PhotoGrid` measurement effect, capture the observed element, keep the initial animation-frame measurement, and on cleanup cancel that frame and disconnect the `ResizeObserver`; do not port the rejected layout-hook/state rewrite; and
- reproduce `.pnpm-store` in `.gitignore` from `16264d5` directly (cherry-picking that independent one-file commit is also safe, but reproduction avoids branch-history coupling).

**Reactive/cleanup gates.** Switch mount logs no Base UI button-contract warning. Unmount before and after the initial frame produces no post-unmount state/atom write; observer and frame counts return to zero; StrictMode setup/cleanup/setup settles without duplicate live observers/listeners. Layout output before and after the cleanup is unchanged.

**IO/depth proof.** Zero storage, remote, cache, actor, and navigation changes. No new abstraction or type is introduced.

**Rollback.** Each tiny fix is independently revertible. If implemented in parallel, merge the `PhotoGrid.tsx` cleanup before the catalog cutover or rebase it afterward so a textual conflict cannot hide the cleanup.

## Slice 10: Run deletion proofs and final reactivity review

This slice is verification and removal of accidental leftovers, not a deferred ownership cutover. If an old writer, provider, action hook, selector facade, or direct reset is still required here, reject and reopen the slice that was supposed to delete it.

**Deletion/search proof.** Search production code and require:

- no `@xstate/store`, `@xstate/store-react`, `AppStateRuntime`, app-state provider tree, settings context/store facade, catalog machine/actor, selector registry, or natural-size/sync actor;
- no old public `optionsAtom`, `s3SettingsAtom`, `validS3SettingsAtom`, `settingsForSyncAtom`, writable `photosAtom`, dirty/reset atoms, `useFetchPhotoList`, or per-command storage hook;
- `listStoredImages` executes only inside the catalog implementation (plus image-storage adapter/tests); React never constructs storage, parses command settings, merges listings, reconciles facts, or writes a catalog array;
- one profile-replacement composition writer, one canonical projection reducer/writer, one refresh execution edge, one React/router synchronization owner, and one upload actor owner;
- no module-global per-key/per-operation maps, active records that survive settlement, forwarding hooks, compatibility aliases, runtime flags, shadow state, or dormant providers; and
- exactly five settings and five catalog interactions, with no preliminary standalone type inventory or broad command/event object added around them.

**Full automated gate.** Repeat every protected base/main suite, the paired positive/negative subscriber matrix, stable-identity tests, committed-render bounds, ten-microtask settling checks, SSR/Suspense/StrictMode lifecycle tests, exact persistence/adapter/remote counts, URL interleavings, mounted-form replacement, mounted-probe reactivity, route-unmount upload lifetime, cache failure, key reservations, stale completions, and both completion orders for listing versus upload/delete/rename. Then run the full web test, build, and lint gates after deletion.

**Manual behavior gate.** Exercise profile forms and switching, sync pull/remote-wins confirmation, gallery direct URL/back/forward and normalization, modal back/Escape/delete/rename return, manual/empty/background refresh feedback, target mismatch and explicit rebind, selection locality, upload navigation/lifetime/edit locking/retry, and cache reset. Record that no credentialed live S3 smoke is available unless implementation explicitly configures one; deterministic counted adapters are the required race/IO authority.

**Diff review.** Compare against the protected base path list. Review every changed effect/subscription/observer/atom `onMount` line-by-line and name its positive and negative transition. Unrelated UI/atoms/effects must remain byte-for-byte or mechanically equivalent. The replacement ADR remains [Keep ordinary client state in Jotai](../../../docs/adr/0003-keep-client-state-in-jotai.md); do not edit ADR-0002, `CONTEXT.md`, or broaden the exclusions.

**Rollback.** No data migration or feature flag exists. Roll back by reverting completed slices in reverse dependency order. The catalog and upload cutovers are indivisible rollback units.

### Implementation-time unknowns that do not reopen the plan

- The exact TanStack Form call used for the replacement-only rebase must be chosen from the installed version under the mounted-form red test; the required observable behavior and narrow scope are already fixed.
- The focused root code may need a small test-only construction option to inject a Jotai store and external actor. It may not expand the production upload interface, stop caller-owned actors, or become an app-state runtime.
- No live credentialed S3 fixture has been demonstrated. A live smoke may supplement the gates, but absence of credentials does not weaken the deterministic adapter, remote-count, or race requirements.

No additional domain term or design ticket is required. This plan is ready to be expanded into implementation tickets after the final Jotai-first handoff records it.
