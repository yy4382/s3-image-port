# Write the Jotai-first implementation handoff

Type: task
Status: resolved
Blocked by: 08

## Question

What exact agent-ready handoff follows from the resolved Jotai/XState architecture decision, deep module interfaces, reactivity contract, and implementation slices?

Produce a spec-level handoff, not production code. It must name the implementation base and evidence commits, authoritative behavior changes, module ownership and caller-facing interfaces, ordered slices and blocking edges, test/React-review gates, rollback boundaries, reusable logic/tests, discard-only migration code, explicit exclusions, and the standing inference/depth/reactivity constraints.

The handoff should be sufficient input for `/to-tickets` without requiring the next session to reopen architectural decisions or reinterpret `/private/tmp/s3-port-jotai-reapply-handoff.md`.

## Answer

[The compact Jotai-first implementation handoff](/private/tmp/s3-port-jotai-first-implementation-handoff.md) is ready for `/to-tickets` and then `/implement` from `88bda7e`. It fixes the behavior overrides, five-interaction [settings](04-design-deep-settings-interface.md) and [catalog](05-design-deep-image-catalog-interface.md) seams, upload lifecycle evidence from [Prove the Jotai-XState lifecycle seam](02-prove-jotai-xstate-lifecycle-seam.md), the paired [React reactivity contract](06-define-reactivity-preservation-contract.md), and the ten-slice dependency/rollback route in [Choose reactivity-safe reapplication slices](08-choose-reactivity-safe-reapplication-slices.md), under [ADR-0003](../../../docs/adr/0003-keep-client-state-in-jotai.md).

It explicitly separates reusable pure rules/scenarios from discard-only migration code, forbids cherry-picking the mixed commits, preserves the inference/depth/reactivity constraints and exclusions, and records the remaining implementation-time limitations. No production code, branch, dependency, ADR, domain document, other ticket, or map was changed by this resolution.
