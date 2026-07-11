# Migrate access validation

Type: task
Status: resolved

## Parent

.scratch/deepen-image-storage/PRD.md

## What to build

Move storage access and CORS validation onto the image storage interface. Validation should report typed outcomes for success, failed access, and incomplete CORS permissions.

The UI should continue to show the same validation states, but it should no longer depend on raw CORS provider responses.

## Acceptance criteria

- [x] Access validation calls the image storage interface rather than provider-client CORS methods directly.
- [x] The storage result distinguishes failed access from incomplete CORS permissions.
- [x] Allowed and missing methods are preserved for the existing UI.
- [x] Existing validation UI states remain unchanged from a user's perspective.
- [x] Tests cover valid access, failed access, no CORS result, incomplete CORS methods, wildcard origins, and wildcard headers.

## Blocked by

- .scratch/deepen-image-storage/issues/01-create-image-storage-contract.md

## Answer

Access validation now uses `ImageStorage.checkAccess()` instead of calling provider CORS methods from the settings helper. The S3 adapter owns raw CORS response handling, filters rules by current origin plus wildcard headers, and returns typed failures for incomplete CORS permissions or failed access. The settings UI keeps its existing `failed`, `cors-incomplete`, and `success` states.

Verification:

- Focused access-validation and S3-adapter tests pass.
- Full Vitest suite passes: 180 tests.
- Focused ESLint pass for touched files.
- Full TypeScript check only reports the pre-existing `DisplayControl.tsx` page-size type error.
