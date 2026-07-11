# Write the replacement Jotai-XState architecture decision

Type: task
Status: resolved
Blocked by: 03, 04, 05

## Question

What replacement ADR records the accepted Jotai/XState ownership split, deep-module interface rules, composition/lifetime seam, and inference-first TypeScript approach while explicitly superseding ADR-0002 and retaining ADR-0001's upload-workflow decision?

Write the ADR only after the ownership and interface decisions are resolved. It must explain the real trade-off, state why ordinary state remains Jotai and only genuine lifecycle workflows use XState through `jotai-xstate`, forbid dual projection authority and generic runtime/container facades, and record the standing constraints against type-first scaffolding, thin wrappers, oversized interaction surfaces, and broad reactive rewrites.

Do not edit ADR-0002 to rewrite history. Link the new ADR from its resolution answer.

## Answer

[Keep ordinary client state in Jotai](../../../docs/adr/0003-keep-client-state-in-jotai.md) records the accepted split: Jotai owns ordinary client state and the deep image catalog, XState through `jotai-xstate` owns only upload workflows, and two focused writes compose profile replacement and confirmed uploads without an app-wide runtime. It explicitly supersedes ADR-0002 while retaining ADR-0001, and records the inference-first TypeScript, deep-interface, adapter-seam, and reactive-preservation constraints.
