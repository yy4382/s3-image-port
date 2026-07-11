# Remove the public provider client surface

Type: task
Status: resolved

## Parent

.scratch/deepen-image-storage/PRD.md

## What to build

Finish the refactor by removing direct application imports of the old public provider client. The provider-specific implementation should exist only as an adapter behind the image storage module.

This slice should add whatever guardrails are appropriate so future app code crosses the image storage seam instead of bypassing it.

## Acceptance criteria

- [x] No upload, gallery, download, delete, rename, or validation caller imports the old public provider client directly.
- [x] Provider-specific object operations are internal to the storage adapter.
- [x] Generic helper code that remains outside the module is genuinely provider-agnostic or explicitly not a stored-image operation.
- [x] Tests and mocks are updated to use the image storage seam.
- [x] Static checks pass without unused old storage-client exports.
- [x] The old shallow interface is deleted, hidden, or otherwise made unavailable to app callers.

## Blocked by

- .scratch/deepen-image-storage/issues/02-migrate-gallery-listing-to-stored-images.md
- .scratch/deepen-image-storage/issues/03-migrate-delete-rename-download.md
- .scratch/deepen-image-storage/issues/04-migrate-upload-to-image-storage.md
- .scratch/deepen-image-storage/issues/05-migrate-access-validation.md

## Answer

The old `ImageS3Client` implementation now lives inside the image storage adapter package instead of `lib/s3`, and app callers no longer import it directly. The gallery load-error metadata probe now uses `ImageStorage.probeStoredImage()` via the public image storage module. The S3 adapter test mock was updated to the internal adapter path and now covers object probing.

The remaining `lib/s3` helpers are key and URL policy helpers rather than stored-image object operations. ESLint now rejects imports of the removed public client path and the adapter-internal client alias, so future app code is directed back through the image storage seam.

Verification:

- Boundary search shows `ImageS3Client` only under `modules/image-storage/adapters` and ESLint guardrail entries.
- Focused image-storage and gallery tests pass: 33 tests.
- Focused ESLint pass for touched storage and gallery files.
