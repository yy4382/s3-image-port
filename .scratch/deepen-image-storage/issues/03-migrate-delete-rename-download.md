# Migrate delete, rename, and download

Type: task
Status: resolved

## Parent

.scratch/deepen-image-storage/PRD.md

## What to build

Move stored image delete, rename, and download flows onto the image storage interface. These actions should consume typed storage results instead of raw provider responses, thrown provider errors, or string-matched messages.

Rename behavior must preserve the existing safety model: target keys are checked before overwrite unless force is explicit, and partial rename is represented as an expected result.

## Acceptance criteria

- [x] Delete actions call the image storage interface and handle typed expected failures.
- [x] Batch delete preserves current selection cleanup and refresh behavior.
- [x] Rename actions call the image storage interface and distinguish same-key, invalid-key, already-exists, success, partial-rename, and unknown outcomes.
- [x] Forced rename remains explicit.
- [x] Download actions receive browser-usable image data without exposing provider body types to callers.
- [x] Tests cover expected delete, rename, download, already-exists, not-found, access-denied, partial-rename, and unknown outcomes.

## Blocked by

- .scratch/deepen-image-storage/issues/01-create-image-storage-contract.md
- .scratch/deepen-image-storage/issues/02-migrate-gallery-listing-to-stored-images.md

## Answer

Delete, rename, and download gallery actions now use the image storage interface. Delete and rename preserve the existing refresh and selected-image cleanup behavior, rename keeps explicit overwrite handling, and download receives a browser `Blob` from storage instead of provider response bodies.

Verification:

- Focused photo-action and S3-adapter tests pass.
- Full Vitest suite passes: 169 tests.
- Focused ESLint pass for touched files.
- Full TypeScript check only reports the pre-existing `DisplayControl.tsx` page-size type error.
