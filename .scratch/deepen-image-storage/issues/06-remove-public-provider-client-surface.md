# Remove the public provider client surface

Type: task
Status: ready-for-human

## Parent

.scratch/deepen-image-storage/PRD.md

## What to build

Finish the refactor by removing direct application imports of the old public provider client. The provider-specific implementation should exist only as an adapter behind the image storage module.

This slice should add whatever guardrails are appropriate so future app code crosses the image storage seam instead of bypassing it.

## Acceptance criteria

- [ ] No upload, gallery, download, delete, rename, or validation caller imports the old public provider client directly.
- [ ] Provider-specific object operations are internal to the storage adapter.
- [ ] Generic helper code that remains outside the module is genuinely provider-agnostic or explicitly not a stored-image operation.
- [ ] Tests and mocks are updated to use the image storage seam.
- [ ] Static checks pass without unused old storage-client exports.
- [ ] The old shallow interface is deleted, hidden, or otherwise made unavailable to app callers.

## Blocked by

- .scratch/deepen-image-storage/issues/02-migrate-gallery-listing-to-stored-images.md
- .scratch/deepen-image-storage/issues/03-migrate-delete-rename-download.md
- .scratch/deepen-image-storage/issues/04-migrate-upload-to-image-storage.md
- .scratch/deepen-image-storage/issues/05-migrate-access-validation.md
