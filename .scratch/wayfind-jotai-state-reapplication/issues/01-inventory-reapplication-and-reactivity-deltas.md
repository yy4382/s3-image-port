# Inventory reapplication and reactivity deltas

Type: task
Status: resolved

## Question

Which decisions, pure rules, tests, and user-visible corrections at `2664318` should be reapplied to the Jotai base at `88bda7e`, and which changed Jotai atoms, selector identities, React effects, provider lifetimes, or render dependencies are risky evidence from the rejected migration rather than reusable implementation?

Produce a durable inventory, not a design or production-code change. Separate:

- behavior/domain decisions that remain authoritative;
- pure reconciliation, validation, URL, and command-outcome logic that can be selectively ported;
- deterministic tests that can be reused as contracts versus tests coupled to the rejected implementation;
- migration-only XState Store/runtime/provider code to discard;
- existing base atoms/effects/reactive paths that should be treated as protected and changed only with a specific reason and regression proof;
- observed or strongly evidenced reactivity regressions, including unstable identities, missed subscriptions, effect loops, stale closures, route echoes, duplicate IO, and route-unmount lifetime loss.

Use `main` at `72e942667f2fe31b047dae663e4f5484964983c4` as the ordinary behavior oracle and the supplied handoff's eight intentional changes as explicit overrides. Do not infer that code at `2664318` is correct merely because its tests pass.

## Answer

[The durable reapplication and reactivity inventory](../assets/01-reapplication-reactivity-inventory.md) separates the authoritative source-of-truth and behavior decisions, all eight accepted overrides, pure rules and deterministic scenarios eligible for selective porting, implementation-coupled tests, discard-only XState Store/runtime code, and the base Jotai atoms/effects/providers that are protected from broad rewrites.

The inventory confirms that the mixed refactor is evidence rather than an implementation source. Its strongest missed-update finding is that the refactored mounted photo probe stopped reacting to validated settings changes while its StrictMode test covered only request deduplication. It also records excess whole-selection tile rerenders and storage-edit listing at the base, route-local upload lifetime loss, duplicate upload-editor subscriptions and unbounded selector registries in the rejected refactor, and the exact behavior questions the later ownership/interface/reactivity tickets must resolve. This was a static, read-only comparison; no full suite or live S3 smoke was run.
