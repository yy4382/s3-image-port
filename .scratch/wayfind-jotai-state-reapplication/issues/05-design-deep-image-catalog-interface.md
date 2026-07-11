# Design the deep image catalog interface

Type: grilling
Status: resolved
Blocked by: 03

## Question

What single deep Jotai interface should the image catalog present to React, upload integration, settings-profile replacement, and tests while hiding refresh joining, target mismatch, profile/settings revisions, key reservations, confirmed-fact reconciliation, cache policy, and stale-completion rejection?

Resolve the minimum read and write surface for cached/empty/unloaded projection state, derived gallery view, keyed selection, refresh lifecycle, upload confirmation, delete/rename/probe/download/copy safety, typed command outcomes, and profile replacement. Preserve one canonical projection authority and the existing `s3ip:gallery:photos` `StoredImage[]` cache contract.

The design must keep derived arrays, command identities, and unaffected item subscriptions stable; block target-dependent operations with zero IO while a last-good projection belongs to an old target; and support disjoint mutation concurrency, overlapping-key rejection, request joining, and both completion orders of refresh versus confirmed upload/delete/rename.

Do not expose internal events, revision bookkeeping, reservations, async registries, a large selector collection, or thin per-command wrappers. Prefer Jotai/Zod inference and a small behavior-rich interface that existing reactive call sites can adopt incrementally. The catalog has no XState actor; preserve the base atoms and React reactivity wherever the accepted behavior can be added without replacing them.

## Comments

- The user explicitly delegated this design decision to the agent and instructed it not to run a HITL grilling exchange. Resolve autonomously from the accepted map decisions and repository evidence.

## Answer

The image catalog is one deep Jotai/plain module with one canonical projection and five caller interaction points. It is constructed as a stable graph of atoms, not as an actor, provider, lifecycle object, runtime container, selector barrel, or family of command hooks.

An illustrative shape is:

```ts
const imageCatalog = {
  state,
  view: { filter, page, pageSize, selection },
  item(key),
  run,
  integrate,
}
```

`createImageCatalog(createStorage, cacheStorage?)` creates this atom graph for production or deterministic tests. Production exports one graph using `createS3ImageStorage`; tests create the same graph with a counted in-memory storage implementation and, when needed, a controllable browser `Storage`. The creator holds only stable dependencies. Active requests, promises, reservations, reconciliation tokens, and deduplication records live in unexported atoms, so they are isolated per Jotai store rather than in module-global closure maps. There is no `activate()`, `stop()`, context provider, or second catalog instance hidden in a composition runtime.

### 1. `state`: one public read model

`state` is a read-only atom whose value contains only caller-observable facts, grouped rather than flattened into a selector inventory:

- projection: `unloaded`, `empty`, or `ready`; the current `StoredImage[]`; whether the last-good projection is usable for the current storage target; stale state; and the latest cache diagnostic;
- gallery derivation: available prefixes, current-page stored images, filtered count, page count, and `catalog-empty` versus `filtered-empty` presentation;
- refresh: idle/refreshing, foreground/background intent, and the last typed success/failure outcome;
- background-refresh eligibility for the retained `Gallery` effect.

It does **not** expose profile generation, storage revision, target IDs, projection revision, journal entries, pending-request records, key reservations, command-ID records, reconciliation tokens, or per-operation selector state. Delete/rename/access outcomes are returned by `run`; React does not subscribe to an operation registry.

The read model preserves references, not just equal values. Stored images change identity only when the accepted projection changes. Prefixes change only with stored images. Filtered/current-page arrays change only with their real projection/filter/page dependencies. Refresh, mutation, cache-diagnostic, selection, target-safety, and settings updates must not recreate unaffected arrays. Callers needing one branch use a module-local `selectAtom` at the consuming React file; the catalog publishes no named selector collection or generic selector wrapper.

Projection kind has exact cache semantics:

- missing or malformed cache is `unloaded` with an empty image list; malformed data also records a load diagnostic;
- a valid cached `[]` is `empty`, not `unloaded`;
- any successful listing, including `[]`, establishes a projection bound to the target used by that listing;
- an accepted confirmed upload also establishes a projection for its current target;
- a failed refresh keeps the last-good projection and its array identity;
- cache persistence failure is diagnostic only and never rolls back accepted in-memory data.

The backing cache remains exactly `s3ip:gallery:photos` containing a JSON `StoredImage[]` validated by `storedImageSchema`. No envelope, revision, target ID, journal, or uppercase legacy `Photo[]` is persisted. Profile replacement clears it by writing `[]` while the live projection immediately becomes `unloaded` for the new profile.

### 2. `view`: retain the passive Jotai view graph

`view` contains the existing reactive data seams rather than replacing them with commands or an actor snapshot:

- `filter` is the current Zod-derived gallery filter atom;
- `page` is the current-page atom;
- `pageSize` is the existing page-size atom;
- `selection` reads the selection summary and accepts the existing selection behaviors: toggle/shift-toggle, select current page, and clear.

The first three remain ordinary writable Jotai data. React/router code may read and set them but is solely responsible for deciding which values belong in the URL, parsing and normalizing the URL, serializing it, and choosing push versus replace. The catalog has no URL type, route state, history method, or URL-hydration command. Selection and current page remain outside the URL.

`selection` keeps the existing `Set<string>` source and shift-range semantics behind one writable atom. Its read value supplies selected keys/count, whether the current page is selected, and whether the current selection is eligible for delete or rename. Delete eligibility includes target safety and reservations; rename additionally requires exactly one selected key. The raw set, filtered images used by shift selection, and busy-key set remain implementation state.

The base filter/prefix/search/sort/pagination atoms and derivations should be moved behind this module with the smallest edits possible. They are not to be reimplemented as a new aggregate store. Page reset/clamping behavior remains at its current proven Jotai/React seams until the reactivity contract authorizes a focused change.

### 3. `item(key)`: keyed locality without a registry

`item(key)` creates a read-only derived atom for one mounted stored-image key. It returns only:

- whether that key is selected;
- whether that key is reserved by a mutation;
- an access capability when the projection is usable for the current target, including the current public image source, or no capability when it is not usable.

The returned atom uses equality on this small slice. Toggling or reserving another key may recompute it but cannot notify the unaffected tile. A target mismatch or semantically changed storage-access context does notify the tile so it can remove a loaded overlay, suppress its image source/actions, or retry an error probe as appropriate.

There is deliberately no `atomFamily` cache and no module-global `Map<string, Atom>`. A React tile creates the atom once with `useMemo(() => imageCatalog.item(key), [key])`; the atom becomes collectible with that component. Tests create one atom for the duration of the assertion. When a tile disappears, no catalog registry entry remains to evict. Multiple consumers of one key may own independent tiny derived atoms; correctness does not depend on shared selector identity.

The access capability contains no parsed settings, target ID, or numeric revision. Its reference identity represents the current usable storage-access context. It changes for a semantically relevant validated storage-settings change, preserving the base behavior in which a mounted error tile probes again after settings change, while the `run` command still reads the latest settings itself. When the target mismatches, the capability is absent: no image source, probe, copy, download, delete, or rename action is possible from that tile.

### 4. `run`: one behavior-rich storage command atom

`run` is one write-only atom. `useSetAtom(imageCatalog.run)` gives React one stable function; `store.set(imageCatalog.run, ...)` gives tests the identical seam. It supports four cohesive operations rather than six exported command atoms or hooks:

- `refresh` with foreground/background intent and manual/empty/startup/reconciliation reason;
- `delete` with canonicalized keys and an optional caller command ID;
- `rename` with old key, new key, overwrite intent, and an optional caller command ID;
- `access` with a key and purpose `probe`, `download`, `url`, or `markdown`.

The operation name and input may be separate write-atom arguments (for example `run("delete", { keys })`) so the public seam is not an internal event object. Implement operation functions first and infer the write arguments and outcomes from that implementation table. Do not predeclare a large `ImageCatalogEvent`/`ImageCatalogContext`/outcome type inventory. Existing storage and gallery core values continue to come from Zod schemas; confirmed-fact schemas are colocated with their reducer; literal outcome objects use `as const`, with exported types only when a real caller seam cannot infer them from the atom.

Every operation reads one current, structurally stable storage-operation context from Jotai at invocation: validated storage settings, full settings revision, semantic target identity, and profile generation. React passes none of those values. Semantic target identity is only endpoint + bucket + include path. Any other semantically changed validated storage setting, including credentials, region, path-style, or public URL, changes the broader operation context and supersedes older asynchronous completion without making the last-good projection a different target.

All target-dependent commands share one hidden preflight:

1. read current operation context;
2. return `invalid-settings` before adapter construction when it is invalid;
3. return `target-mismatch` before adapter construction or other target-dependent work when a last-good projection belongs to another target;
4. only then construct storage or derive a URL;
5. on completion, accept the result only if generation and the required settings/target context are still current; otherwise return `superseded` without changing projection, selection, cache, status, or feedback state.

`access("url")` and `access("markdown")` return safe text for the existing clipboard UI; `access("download")` returns the browser-usable download value; React owns the anchor/clipboard gesture and toast, not settings parsing or safety. `access("probe")` returns metadata and joins an identical in-flight key + operation-context request, including StrictMode replay. The probe record is removed on settlement; downloads are not silently joined. No action performs target IO or produces a new-target URL while the projection is mismatched.

`refresh` has one active promise per profile generation. Concurrent intents return that same promise and therefore one `listStoredImages` call. A foreground caller upgrades a background refresh's public intent. Success binds the projection to the request target, reconciles confirmed facts newer than the listing's start revision, persists the accepted projection, and settles every waiter. Failure keeps last-good images. Invalid settings and adapter-construction failure settle normally. No retry loop is added.

The existing `Gallery` effect remains the execution edge for startup, invalid-to-valid, and auto-refresh enablement, but it observes a catalog-derived eligibility boolean and the stable `run` setter. Consequently a valid-to-valid settings edit changes neither dependency and issues no list. Profile replacement and confirmed/uncertain mutation reconciliation are scheduled from `integrate`/`run`, not invented by React. A target change never becomes auto-refresh eligibility; it waits for explicit refresh.

Delete and rename reserve keys synchronously before adapter construction. Delete reserves its unique sorted keys; rename reserves both old and new keys. Disjoint operations proceed concurrently. An overlap returns `keys-busy` with conflicting keys and zero adapter/remote calls. While a caller-provided command ID is active, an identical canonical command returns the same promise; a different kind or canonical input returns `command-id-conflict`. Active command records are removed on settlement rather than retained in an unbounded operation registry.

Delete clears every requested key from selection on terminal outcome, including failure. Only confirmed deleted keys leave the projection. Because a multi-key delete failure can be uncertain, it marks the projection stale and schedules/joins one reconciliation. Rename remaps selection only after confirmed success. `already-exists` changes neither projection nor selection and schedules no list. Partial or otherwise uncertain rename retains its structured storage facts and schedules/joins one reconciliation.

`run` returns typed literal outcomes using the accepted vocabulary: `refreshed`, `refresh-failed`, `deleted`, `delete-failed`, `renamed`, `rename-failed`, `already-exists`, `partial-rename`, `invalid-settings`, `target-mismatch`, `keys-busy`, `command-id-conflict`, and `superseded`, plus purpose-specific successful `access` values. Cache diagnostics may accompany accepted projection-changing outcomes. React translates outcomes to the existing toast/dialog behavior; the module does not import translations or toast UI.

### 5. `integrate`: the only cross-module fact atom

`integrate` is a write-only atom with exactly two external facts:

- a confirmed upload containing the Zod-validated `StoredImage`, upload ID, and the generation/settings revision captured when upload IO began;
- profile replacement after the composition atom has installed the replacement settings and advanced profile generation.

These are boundary facts, not the catalog's internal reducer events. Listing, delete, rename, uncertainty, request completion, reservation, and cache events are private and cannot be sent by React or another module.

An accepted upload is idempotent by upload ID within the current generation, upserts the stored image immediately, binds a previously unloaded projection to the current target, persists the array, and schedules/joins exactly one reconciliation. A duplicate, stale revision/generation, or target-unsafe upload fact is ignored with a typed result and cannot mutate the catalog. The confirmed-fact journal is generation-scoped and bounded to facts still needed by active listing starts plus a small bounded recent-ID window; it is never a public or module-global registry.

Profile replacement is the hard reset seam. It immediately settles old-generation refresh/mutation waiters as `superseded`, releases reservations, invalidates scheduled reconciliation tokens, clears projection/view/selection and confirmed-fact state, writes cache `[]`, and establishes one fresh stale/unloaded generation. Late remote completion can still resolve at the adapter level but fails the generation check and performs no Jotai write. The outer composition atom invokes this once and clears the independent natural-size cache once; ordinary settings edits never invoke it.

### Canonical projection and reconciliation

The private projection reducer is the sole authority for `StoredImage[]`. There is no writable photo array alongside it. Its core stored-image and confirmed-fact shapes are Zod-first and inferred. It records a monotonically increasing projection revision and the minimum confirmed-fact journal needed by an active refresh:

- a listing captures the revision at request start;
- confirmed upload/delete/rename applies immediately and receives the next revision;
- listing completion rebuilds listed entries and replays only confirmed facts newer than its start;
- if the listing finishes first, the later fact applies immediately and schedules one reconciliation;
- if the fact finishes first, the older listing replays it and cannot undo it;
- after no active listing needs older facts, the journal is pruned;
- profile replacement resets revision and journal.

This covers both completion orders without a shadow array or machine context. Rename replaces an existing destination at the source's ordering position. Semantically unchanged accepted data retains the existing projection/derived references. Cache persistence happens after the in-memory fact is accepted; persistence failure records a diagnostic but cannot reverse the fact.

### Incremental adoption and deletion path

Adopt the interface without a compatibility facade:

1. Put the existing filter/page/page-size/selection atoms and current prefix/filter/sort/page derivations behind the catalog module unchanged; first port projection/cache/reconciliation as pure Jotai reducer state and test it through a Jotai store.
2. Cut all listing writers over together from `useFetchPhotoList` to `run("refresh", ...)`, retaining the current `Gallery` effect and UI feedback. Delete the old fetch implementation in the same slice so two refresh authorities never coexist.
3. Cut delete/rename/probe/download/copy callers to `run` and delete the per-command storage hooks rather than retaining pass-through wrappers. Keep UI-specific clipboard, browser download, confirmation, translation, toast, and navigation behavior at React call sites.
4. Change `PhotoItem` only enough to use one memoized `item(key)` atom and access capability; leave unrelated image/loading/hover/layout effects intact. Prove other-key selection and reservation do not rerender it.
5. Wire successful upload and the profile-replacement composition atom to `integrate`, then remove the dirty/reset writes they replace. Natural-size clearing remains in composition, not catalog.
6. Remove old direct writable image-list exports after their callers move. Do not leave aliases, selector barrels, compatibility hooks, a second projection, or a public internal-state escape hatch.

The persisted projection atom is the only existing atom whose representation must deepen to distinguish unloaded from known-empty and carry reconciliation metadata. Display, page, page-size, selection, URL effects, modal navigation, and layout atoms are protected from broad rewrite. A migration slice may relocate their definitions/imports, but behavior changes require the separate reactivity contract and its render/effect/IO-count proof.

### Test surface and guarantees

Catalog tests use `createStore()` and only the same five interactions as production. They may inject counted image storage and controllable cache storage but may not read private revision, journal, reservation, request, or scheduler atoms. Required assertions include:

- missing/malformed/cached-empty/listed-empty cache states and unchanged `StoredImage[]` payload;
- reference identity of images/prefix/filter/page arrays under refresh-status, other-key selection, reservation, and unrelated settings changes;
- one-list joining and background-to-foreground upgrade;
- invalid-settings and target-mismatch zero adapter/IO, including probe/download/link/delete/rename;
- mounted probe reactivity plus StrictMode joining;
- old-target tile inertness and removal of an already-loaded overlay;
- disjoint mutation concurrency, overlapping-key rejection, active command-ID joining/conflict, and cleanup after settlement;
- delete selection cleanup, successful rename remap, `already-exists`, partial/uncertain reconciliation, and cache-write failure without rollback;
- refresh-before-fact and fact-before-refresh for upload/delete/rename;
- immediate upload appearance and duplicate/stale upload rejection;
- immediate profile reset, waiter supersession, late-completion rejection, and exactly one cache clear/reconciliation decision;
- stable `run`/`integrate` atom identities and no module-global per-key or per-operation growth.

This interface gives React passive Jotai data plus two stable write setters, gives upload/profile composition one narrow fact seam, and gives tests the production seam. The complexity that justified a large implementation—target safety, request joining, concurrency, reconciliation, cache policy, and stale rejection—disappears behind those five interaction points instead of reappearing as caller obligations.
