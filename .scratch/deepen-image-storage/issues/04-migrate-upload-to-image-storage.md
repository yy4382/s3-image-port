# Migrate upload to image storage

Type: task
Status: resolved

## Parent

.scratch/deepen-image-storage/PRD.md

## What to build

Move upload storage writes onto the image storage interface. Upload should pass the already-selected key and already-processed file or blob into storage. Compression and key-template policy stay outside the image storage module.

The upload flow should handle typed storage outcomes and continue to mark the gallery dirty on successful upload.

## Acceptance criteria

- [x] Upload no longer constructs the provider client directly.
- [x] Upload passes the final key and file/blob body into the image storage interface.
- [x] Compression behavior is unchanged and remains outside storage.
- [x] Key-template behavior is unchanged and remains outside storage.
- [x] Successful upload still marks gallery data dirty.
- [x] Expected upload failures are mapped from typed storage results into existing user feedback.
- [x] Upload tests use the storage seam rather than direct provider-client mocks.

## Blocked by

- .scratch/deepen-image-storage/issues/01-create-image-storage-contract.md
- .scratch/deepen-image-storage/issues/02-migrate-gallery-listing-to-stored-images.md

## Answer

Upload now writes through the image storage interface with the already-derived key and already-processed file body. Compression and key-template handling remain in the upload module, and successful uploads still mark gallery data dirty. Upload tests now install a storage seam instead of mocking `ImageS3Client` directly.

Verification:

- Focused upload and S3-adapter tests pass.
- Full Vitest suite passes: 171 tests.
- Focused ESLint pass for touched files.
- Full TypeScript check only reports the pre-existing `DisplayControl.tsx` page-size type error.
