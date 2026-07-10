# Map: Plan the Jotai-first state reapplication

Label: wayfinder:map

## Destination

Produce a replacement architecture decision and an agent-ready implementation handoff for selectively reapplying the intentional behavior and architecture corrections from `codex/upload-pages-xstate-refactor` (`2664318`) onto `codex/deepen-image-storage` (`88bda7e`), while retaining Jotai as the app-state model and XState only for genuine workflows. The route is clear when module ownership, small deep interfaces, the Jotai/XState lifetime seam, React-reactivity protections, implementation slices, and deterministic gates are fixed well enough to hand to `/to-tickets` and `/implement` without reopening design decisions.

## Notes

- This is a planning/spec map only. Do not change production code or create the implementation branch while resolving it. The implementation effort starts from `codex/deepen-image-storage`; the current `codex/upload-pages-xstate-refactor` branch remains reference evidence.
- Starting evidence: `/private/tmp/s3-port-jotai-reapply-handoff.md`, [Write implementation handoff](../wayfind-image-catalog-state-boundary/issues/04-write-implementation-handoff.md), [Choose migration slices and verification](../wayfind-image-catalog-state-boundary/issues/08-choose-migration-slices-and-verification.md), `tickets.md`, `docs/adr/0001-use-xstate-for-upload-workflows.md`, and the relevant tests at `2664318`. Use `main` at `72e942667f2fe31b047dae663e4f5484964983c4` as the user-visible oracle except for the eight intentional behavior changes named in the supplied handoff.
- Never cherry-pick `72d9848` or `2664318`; they mix useful decisions with the rejected global state-library migration. Reuse tests and pure domain logic selectively.
- Use the domain language in `CONTEXT.md`: stored image, pending upload, upload queue, image catalog, settings profile, and sync workflow. Use `/domain-modeling` when a real domain-language gap appears; implementation terms such as revision, generation, reservation, selector, atom, and actor do not belong in the glossary.
- Use `/codebase-design` for module decisions. Prefer a deep module with one small interface and high leverage. Do not create clusters of thin wrappers or pass-through facades. More than five similar, same-purpose exports or interaction points on one module/object is a design smell that must trigger interface redesign; do not reproduce an `AppStateRuntime`-style grab bag.
- Keep TypeScript inference-first and JavaScript-like. Do not front-load inventories of standalone types and then write code around them. Let Jotai, Zod, and contextual TypeScript inference carry types wherever possible; infer core data structures from Zod schemas. Add explicit types only where a real seam, validation contract, or typed outcome needs one.
- Treat React reactivity as a protected behavior surface. Do not massively rewrite existing Jotai atoms, derived atoms, `useEffect` paths, or selector wiring. Prefer incremental ownership changes behind existing reactive seams, and require evidence for render locality, stable identities, effect settling, and remote-call counts before removing or rewriting a reactive path.
- Preserve one authority per state and side effect. React may read stable atoms/selectors and invoke focused writes/commands; it must not parse settings, build storage adapters, merge listings, coordinate cache/profile resets, or own workflow reconciliation. This does not justify a large command facade, generic dependency-injection container, or app-wide runtime object.
- `docs/adr/0002-use-xstate-actors-for-client-state.md` records the superseded destination and must not be edited to imply it is still accepted. The replacement ADR should explicitly supersede it while retaining ADR-0001's upload-workflow decision.

## Decisions so far

- [Prove the Jotai-XState lifecycle seam](issues/02-prove-jotai-xstate-lifecycle-seam.md) — Keep the upload workflow in one focused owner above the route: an inert external actor, one writable snapshot/send atom, deferred final cleanup, and IO-start reads from the current Jotai store.
- [Inventory reapplication and reactivity deltas](issues/01-inventory-reapplication-and-reactivity-deltas.md) — Preserve the base Jotai reactive graph by default, selectively port only accepted behavior/pure rules/contracts, discard the XState Store/runtime surfaces, and treat the removed settings-driven photo-probe update as a concrete reactivity decision.
- [Choose state ownership and composition seams](issues/03-choose-state-ownership-and-composition-seams.md) — Keep ordinary state and the deep image catalog in Jotai, reserve XState for upload only, leave URL/sync behavior at existing React seams, and integrate modules through two focused writes instead of a runtime container.
- [Design the deep settings interface](issues/04-design-deep-settings-interface.md) — Expose five behavior-rich Jotai atoms for profiles, storage, upload, gallery, and replacement while preserving the existing persistence/focused-atom graph and stable inferred projections.
- [Design the deep image catalog interface](issues/05-design-deep-image-catalog-interface.md) — Expose five deep Jotai interactions for the stable read model, passive view atoms, mount-local keyed items, storage commands, and cross-module facts while hiding projection and concurrency policy.
- [Define the React reactivity preservation contract](issues/06-define-reactivity-preservation-contract.md) — Require paired missed/excess-update proofs, stable five-interaction identities, bounded commits, exact IO/lifetime/route contracts, and same-slice deletion of replaced authorities.
- [Write the replacement Jotai-XState architecture decision](issues/07-write-replacement-jotai-xstate-adr.md) — ADR-0003 keeps ordinary state and the deep catalog in Jotai, reserves XState for upload workflows, and composes modules through focused writes and one storage adapter seam.
- [Choose reactivity-safe reapplication slices](issues/08-choose-reactivity-safe-reapplication-slices.md) — Implement through ten dependency-linked slices, allowing only a pure dormant catalog kernel and using atomic catalog/upload cutovers with paired reactivity and exact IO/race gates.
- [Write the Jotai-first implementation handoff](issues/09-write-jotai-first-implementation-handoff.md) — Published the agent-ready handoff for implementation from `88bda7e` through ten dependency-linked slices with atomic cutovers and paired reactivity, IO, and race gates.

## Not yet specified

None.

## Out of scope

- Implementing the reapplication, creating its branch, or publishing implementation tickets while this planning map is active.
- Reintroducing the global Jotai-to-XState Store migration, adding `@xstate/store` or `@xstate/store-react`, removing Jotai/Jotai optics/the Jotai provider/`atomWithStorageMigration`, or porting the old `AppStateRuntime` and provider tree.
- Broad cleanup or modernization of existing Jotai atoms, React effects, selectors, or UI code that is not required by a preserved behavior or an explicitly accepted correction.
- Legacy uppercase `Photo[]` catalog-cache migration; `PutStoredImageInput.contentType` passthrough repair; sync workflow redesign; UI copy/layout or route redesign; new storage providers; retry policy or automatic retry loops; and a persisted upload queue.
