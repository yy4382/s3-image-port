# Choose state ownership and composition seams

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

Given [Inventory reapplication and reactivity deltas](01-inventory-reapplication-and-reactivity-deltas.md) and [Prove the Jotai-XState lifecycle seam](02-prove-jotai-xstate-lifecycle-seam.md), which module owns each source of truth and workflow, and what is the smallest composition seam that connects them without dual ownership or an `AppStateRuntime`-style grab bag?

Resolve ownership for settings profiles/persistence/projections/access testing, image catalog projection/view/selection/refresh/mutations/reconciliation, upload queue and pending uploads, sync configuration/workflow, natural-size cache, gallery URL state, photo actions, storage adapter construction, and profile-replacement effects.

Choose explicitly whether the image catalog actor owns the canonical projection or emits typed facts into one Jotai projection reducer; it must not do both. State which XState lifecycles remain meaningful and which state stays plain Jotai/module code. Define no more cross-module wiring than the chosen behaviors require, and reject a generic container, event bus, or large runtime object.

## Comments

- The user accepted keeping the canonical image-catalog projection in one Jotai reducer. XState owns only refresh/mutation lifecycles and emits facts into that reducer; it does not keep a second image projection. Existing Jotai-derived view and selection state remain the reactive base to evolve incrementally.
- The user corrected that split: the image catalog does not warrant a state machine. Its projection, derived view/selection, refresh, mutations, reconciliation, and async coordination all stay in one Jotai/plain module. XState is reserved for genuinely complex workflows, currently the upload queue and pending uploads.
- The user accepted one explicit composition write atom for genuine active-profile replacement. Load/import/sync replacement routes through it so settings update, profile-generation advance, image-catalog reset, and natural-size-cache clear happen exactly once; ordinary edits bypass it. No subscription, React effect, runtime container, or event bus coordinates this behavior.
- The user accepted the image catalog as an intentionally large, deep Jotai module. It owns target-bound stored-image operations as well as projection/view/selection/refresh/mutations/reconciliation; the size of its implementation does not justify splitting target safety across shallow modules, while its caller-facing interface must remain small.
- The user corrected the view/URL split after reviewing the recommendation: preserve the base reactive implementation as much as possible. URL parsing, normalization, serialization, history, and the choice of URL-backed fields remain entirely in React/router code. Existing Jotai display/page/selection atoms passively expose data to read and set; neither the image catalog nor those atoms know URL structure. Any route-sync change must be the smallest behavior-proven React-side correction.
- The user accepted retaining settings as the existing Jotai persistence/projection model. Raw fields, Zod validation, persisted settings profiles, stable derived projections, profile operations, and storage-access command/status atoms stay there; no new store facade, provider, or actor is introduced. Cross-module profile replacement remains outside it in the accepted composition write atom.
- The user accepted the upload queue and pending uploads as the only XState-owned state. One focused owner above the upload route creates/starts/stops the queue actor, exposes one writable Jotai queue atom, reads current settings/generation/revision when upload IO starts, and sends confirmed stored-image facts through one catalog write atom. Route unmount does not destroy pending work; final owner disposal stops its actor.
- The user decided to retain the existing React Query/Jotai sync workflow for this map rollout. It remains outside the catalog, is not redesigned as a machine, consumes the stable sync-format settings projection, and uses the accepted composition write atom only when a pulled result genuinely replaces the active profile.
- The user accepted retaining the natural-size cache as its existing independent Jotai/plain cache. The profile-replacement composition atom clears it directly and exactly once; no actor, provider, transition wrapper, or generic cache abstraction is introduced.
- The user accepted `createStorage` as the single injected adapter seam. The image catalog, upload workflow, and settings access test consume it directly inside their owning modules and read current validated settings when each operation starts. React never constructs adapters or passes parsed settings into commands, and no runtime object proxies storage operations.

## Answer

Use Jotai and the existing reactive graph for ordinary client state. Reserve XState for the upload queue and pending-upload workflows only; the image catalog does not warrant a state machine.

- **Settings** retains its existing Jotai persistence, raw/edit state, Zod validation, stable projections, profile operations, and focused storage-access command/status atoms. It gains no Store facade, actor, or provider.
- **Image catalog** is one intentionally large, deep Jotai/plain module. It is the sole authority for stored-image projection and cache policy, target binding and mismatch safety, refresh joining, upload/delete/rename reconciliation, key reservations, stale-completion rejection, target-bound photo actions, and the derived catalog data its callers need. It has no actor or duplicate projection.
- **Gallery view and URL** preserve the base reactive implementation as much as possible. Existing Jotai display/page/selection atoms passively expose data. React/router code alone knows URL shape, URL-backed fields, normalization, serialization, and history. Route synchronization receives only narrowly proven fixes.
- **Upload** remains the only XState-owned area. One focused owner above the upload route creates and owns the queue actor, exposes one writable Jotai-facing queue atom, reads current settings/generation/revision when IO starts, and sends confirmed stored-image facts through one catalog write atom. Route unmount preserves pending work; final owner disposal stops the actor.
- **Profile replacement** uses one explicit composition write atom. Genuine active load/import/sync replacement updates settings, advances profile generation, resets the catalog, and clears the natural-size cache exactly once. Ordinary edits bypass it. No subscription, React effect, event bus, or runtime container coordinates this behavior.
- **Sync** keeps its existing React Query/Jotai implementation for this rollout and only consumes a stable sync-format projection plus the profile-replacement atom when a pull genuinely replaces the active profile.
- **Natural-size cache** remains its existing independent Jotai/plain cache and is cleared directly by profile replacement; no actor or cache abstraction is added.
- **Storage construction** keeps one injected `createStorage` adapter seam. The catalog, upload workflow, and settings access test use it within their owning modules after reading current validated settings at command start. React never constructs adapters or passes parsed settings into commands.

The composition seam is therefore the shared Jotai store plus two behavior-rich cross-module interactions: the profile-replacement write atom and confirmed-upload catalog write. There is no `AppStateRuntime`, generic dependency-injection container, provider tree, event bus, shadow state, or family of pass-through wrappers. This decision adds no domain term to `CONTEXT.md`.
