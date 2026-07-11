# Use XState for upload workflows

The upload page has per-item workflow state that is awkward to express as imperative atom updates: pending uploads can be processed, uploaded individually, uploaded in bulk, retried after failures, removed, and cleared after success. We will use XState state machines for upload workflows, with one upload queue actor spawning one actor per pending upload, so lifecycle transitions are explicit and React consumes actor snapshots through selectors.

## Considered Options

- Keep Jotai write atoms for upload lifecycle. This preserves the current style but leaves the lifecycle spread across actions and UI callbacks.
- Use one flat queue machine with status strings in context. This improves naming but still centralizes every per-item transition in one reducer-like context.
- Use a queue machine with child pending-upload machines. This matches the domain shape: the queue owns membership, and each pending upload owns its own lifecycle.

## Consequences

The first migration keeps Jotai for existing settings and gallery atoms. Upload code may read Jotai-backed settings at the React seam, but upload lifecycle state should live in XState actors.
