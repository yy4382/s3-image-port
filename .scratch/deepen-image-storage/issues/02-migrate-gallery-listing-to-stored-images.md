# Migrate gallery listing to stored images

Type: task
Status: resolved

## Parent

.scratch/deepen-image-storage/PRD.md

## What to build

Move the gallery's stored image listing path onto the image storage interface. The gallery should receive `StoredImage` values from the module rather than raw provider-derived photo data.

This slice should also retire the storage-facing `Photo` type in favor of `StoredImage` for gallery data, without renaming user-facing UI labels or routes.

## Acceptance criteria

- [x] Gallery listing calls the image storage interface rather than constructing a provider client directly.
- [x] Stored image listing returns storage-facing data through `StoredImage`.
- [x] Existing gallery filtering, sorting, prefix derivation, pagination, and refresh behavior still work.
- [x] Listing failures are mapped from typed storage results into existing user feedback.
- [x] Tests verify gallery listing behavior through the new seam.
- [x] Cosmetic route, translation, and label renames are not included.

## Blocked by

- .scratch/deepen-image-storage/issues/01-create-image-storage-contract.md

## Answer

Gallery listing now creates an `ImageStorage` from S3 settings and consumes `listStoredImages()` results. The S3 adapter normalizes the old provider list shape into `StoredImage`, maps expected S3 errors into typed storage failures, and the gallery atoms/components now use `StoredImage.key` and `StoredImage.lastModified`.

Verification:

- Focused gallery/image-storage tests pass.
- Full Vitest suite passes: 156 tests.
- Focused ESLint pass for touched files.
- Full TypeScript check only reports the pre-existing `DisplayControl.tsx` page-size type error.
