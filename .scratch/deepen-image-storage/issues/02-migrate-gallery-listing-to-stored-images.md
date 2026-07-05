# Migrate gallery listing to stored images

Type: task
Status: ready-for-human

## Parent

.scratch/deepen-image-storage/PRD.md

## What to build

Move the gallery's stored image listing path onto the image storage interface. The gallery should receive `StoredImage` values from the module rather than raw provider-derived photo data.

This slice should also retire the storage-facing `Photo` type in favor of `StoredImage` for gallery data, without renaming user-facing UI labels or routes.

## Acceptance criteria

- [ ] Gallery listing calls the image storage interface rather than constructing a provider client directly.
- [ ] Stored image listing returns storage-facing data through `StoredImage`.
- [ ] Existing gallery filtering, sorting, prefix derivation, pagination, and refresh behavior still work.
- [ ] Listing failures are mapped from typed storage results into existing user feedback.
- [ ] Tests verify gallery listing behavior through the new seam.
- [ ] Cosmetic route, translation, and label renames are not included.

## Blocked by

- .scratch/deepen-image-storage/issues/01-create-image-storage-contract.md
