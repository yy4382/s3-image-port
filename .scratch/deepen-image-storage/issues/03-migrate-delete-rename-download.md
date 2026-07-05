# Migrate delete, rename, and download

Type: task
Status: ready-for-human

## Parent

.scratch/deepen-image-storage/PRD.md

## What to build

Move stored image delete, rename, and download flows onto the image storage interface. These actions should consume typed storage results instead of raw provider responses, thrown provider errors, or string-matched messages.

Rename behavior must preserve the existing safety model: target keys are checked before overwrite unless force is explicit, and partial rename is represented as an expected result.

## Acceptance criteria

- [ ] Delete actions call the image storage interface and handle typed expected failures.
- [ ] Batch delete preserves current selection cleanup and refresh behavior.
- [ ] Rename actions call the image storage interface and distinguish same-key, invalid-key, already-exists, success, partial-rename, and unknown outcomes.
- [ ] Forced rename remains explicit.
- [ ] Download actions receive browser-usable image data without exposing provider body types to callers.
- [ ] Tests cover expected delete, rename, download, already-exists, not-found, access-denied, partial-rename, and unknown outcomes.

## Blocked by

- .scratch/deepen-image-storage/issues/01-create-image-storage-contract.md
- .scratch/deepen-image-storage/issues/02-migrate-gallery-listing-to-stored-images.md
