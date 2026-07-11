---
status: accepted
---

# Keep ordinary client state in Jotai

S3 Image Port needs explicit workflow lifecycles for pending uploads, but its settings, image catalog, gallery view, sync workflow, and caches are locally authoritative or derived state that already have a working Jotai reactive graph. We will keep Jotai as the ordinary client-state model and use XState through `jotai-xstate` only for the upload queue and pending-upload workflows. This ADR supersedes [ADR-0002](./0002-use-xstate-actors-for-client-state.md); [ADR-0001](./0001-use-xstate-for-upload-workflows.md) remains accepted.

## Decision

Settings profiles, persistence, validation projections, gallery state, sync state, and the natural-size cache remain Jotai or plain module code. The existing Jotai atoms and React effects are evolved incrementally; they are not replaced by XState stores, actors, provider facades, or duplicate projections.

The image catalog is one intentionally large, deep Jotai/plain module and the sole authority for its stored-image projection. It hides cache policy, refresh joining, target safety, mutation reservations, confirmed-fact reconciliation, and stale-completion rejection behind a small, stable Jotai interface. Its large implementation is deliberate: splitting those policies across thin wrappers would force callers to coordinate the same invariants. There is no catalog machine and no actor-owned shadow projection.

XState is reserved for the upload queue and pending uploads because processing, individual and bulk upload, retry, removal, and child lifetimes are genuine workflow state. A focused owner above the upload route creates one inert actor, starts it only after React commits, exposes one writable Jotai snapshot/send atom built on `atomWithActorSnapshot`, and stops only the actor it created after StrictMode-safe final owner disposal. Route unmount does not discard pending work. Upload IO reads current validated settings, profile generation, and storage-settings revision from the Jotai store when IO starts; initialization-time actor input and React callback dependencies are not sources of live settings.

Gallery URL ownership remains in the existing React/router seam. Catalog and view atoms passively expose values to read and set; they do not know the URL shape, which values are URL-backed, or how history is updated. The existing React Query/Jotai sync workflow also remains at its current seam for this rollout and is not promoted to a machine.

Cross-module behavior is limited to two focused writes:

1. A profile-replacement composition atom applies a genuine active settings-profile replacement, advances profile generation, resets the image catalog, and clears the natural-size cache exactly once. Ordinary settings edits do not use it.
2. A confirmed-upload catalog write accepts a successfully stored image with its upload and revision facts, updates the canonical catalog immediately, and reconciles it with listings. The upload workflow does not write catalog state directly or maintain another projection.

Image storage construction remains one injected `createStorage` adapter seam used inside the settings access test, image catalog, and upload workflow. Each operation validates and reads current settings before constructing the adapter. React does not construct storage adapters, parse settings for commands, or coordinate storage safety. We will not introduce an app-wide runtime object, generic dependency-injection container, event bus, or provider tree to proxy these interactions.

TypeScript remains inference-first and JavaScript-like. Core persisted and boundary data is defined by Zod schemas and its types are inferred from those schemas. Function parameters and return values are inferred where context makes the contract clear; explicit discriminated types are reserved for genuine seams and outcomes. We will not front-load standalone type inventories, build thin pass-through wrappers, or expose oversized command/selector surfaces. More than five similar, same-purpose interaction points on one module is a prompt to deepen or regroup its interface, not to add another facade.

## Considered options

- **Use the XState ecosystem for all client state.** This was ADR-0002's direction. It makes actor/store lifecycle and selector interfaces a concern for state that does not benefit from statecharts, replaces a proven Jotai graph, and encourages a large runtime surface joining unrelated authorities.
- **Use an XState catalog machine beside Jotai gallery state.** The catalog's concurrency rules are substantial, but a machine would either duplicate the projection or force a broad reactive migration. Keeping the projection and its coordination policy in one deep Jotai module preserves one authority.
- **Keep upload lifecycle entirely in Jotai.** This avoids an integration library, but loses the explicit parent/child workflow model already accepted in ADR-0001 and present in the implementation base.

## Consequences

The implementation adds and pins `jotai-xstate` for the focused upload seam; it does not add `@xstate/store` or `@xstate/store-react`, and it retains Jotai, Jotai optics, the Jotai provider, and existing persistence machinery.

Reactive behavior is a compatibility surface. Broad rewrites of existing atoms, derived atoms, selector wiring, or `useEffect` paths are outside this decision. Any necessary change must be narrow and supported by render-locality, reference-identity, effect-settling, and remote-call-count evidence.

The architecture favors locality over uniformity: ordinary state uses Jotai, while the one lifecycle-heavy area uses XState. Callers get a small number of behavior-rich Jotai interactions, and module implementations retain the internal complexity required to enforce their invariants.

The cloud bucket remains authoritative for stored images, while the image catalog is a recoverable local projection. Settings profiles remain locally authoritative, the upload queue remains in-memory workflow state, and the natural-size cache remains independently owned.
