# Migrate upload to image storage

Type: task
Status: ready-for-human

## Parent

.scratch/deepen-image-storage/PRD.md

## What to build

Move upload storage writes onto the image storage interface. Upload should pass the already-selected key and already-processed file or blob into storage. Compression and key-template policy stay outside the image storage module.

The upload flow should handle typed storage outcomes and continue to mark the gallery dirty on successful upload.

## Acceptance criteria

- [ ] Upload no longer constructs the provider client directly.
- [ ] Upload passes the final key and file/blob body into the image storage interface.
- [ ] Compression behavior is unchanged and remains outside storage.
- [ ] Key-template behavior is unchanged and remains outside storage.
- [ ] Successful upload still marks gallery data dirty.
- [ ] Expected upload failures are mapped from typed storage results into existing user feedback.
- [ ] Upload tests use the storage seam rather than direct provider-client mocks.

## Blocked by

- .scratch/deepen-image-storage/issues/01-create-image-storage-contract.md
- .scratch/deepen-image-storage/issues/02-migrate-gallery-listing-to-stored-images.md
