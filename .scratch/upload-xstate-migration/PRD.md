# Upload XState Migration PRD

## Problem

The upload page currently models the upload queue and pending-upload lifecycle with Jotai atoms. Queue mutations, image processing, cloud upload, gallery invalidation, and UI lifecycle status changes are mixed in imperative write atoms, making the workflow harder to reason about and harder to extend safely.

## Goal

Move the upload page process to XState state machines while keeping the user-facing upload behavior intact.

## Requirements

- Represent the upload queue with an XState actor.
- Represent each pending upload lifecycle with its own XState actor.
- Preserve existing behavior:
  - adding dropped or pasted files creates pending uploads;
  - each pending upload receives a generated storage key;
  - optional processing moves an item through processing to processed;
  - individual upload and upload-all use the configured image storage;
  - successful upload marks the gallery catalog dirty;
  - failed processing or upload returns the item to a retryable pending state;
  - uploaded items can be cleared without removing pending items;
  - remove deletes one queued item from the upload queue.
- Keep settings and gallery dependencies injected at the React seam; do not migrate the whole app away from Jotai in this change.
- Keep the machine implementation testable through public actor events and snapshots.
- Do not introduce a generic data layer or global state abstraction as part of this change.

## Design Decisions

- Use XState v5 and `@xstate/react`.
- Use a queue actor with child pending-upload actors.
- Keep the existing `PendingUpload` type name as the domain term surfaced to the UI.
- Keep compression and storage operations as injected effects so tests can exercise the workflow without real compression or S3.
- Keep upload catalog consistency limited to the current `setGalleryDirtyAtom` behavior. The future stored-image catalog module can replace this seam later.

## Test Seams

- Upload machine/module public interface: send events, inspect actor snapshots.
- Upload page behavior: render, add files through the public queue action, click upload/remove/clear controls.

## Out Of Scope

- Migrating settings, gallery, or stored-image catalog to XState.
- Adding persisted upload queue state.
- Adding new failed-state UI.
- Changing upload concurrency semantics.
