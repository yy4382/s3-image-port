# Create the image storage contract

Type: task
Status: resolved

## Parent

.scratch/deepen-image-storage/PRD.md

## What to build

Create the deep image storage module contract. It should define the `StoredImage` schema, expected success and failure result schemas, the storage interface object shape, the factory used by callers, and an in-memory adapter suitable for tests.

This slice is prefactoring: it creates the seam that later slices migrate through. It should be verifiable by module-level tests even before UI callers use it.

## Acceptance criteria

- [x] The stored-image contract is defined by Zod schemas owned by the image storage module.
- [x] Expected failures are represented as discriminated result values, not provider-specific thrown errors.
- [x] A storage interface object can be created from validated settings or from an adapter for tests.
- [x] An in-memory adapter exercises the same interface as production storage.
- [x] Module-level tests cover success, expected failure variants, and schema parsing.
- [x] No production caller is required to migrate in this slice.

## Blocked by

None - can start immediately.

## Answer

Created the initial `apps/web/src/modules/image-storage/` contract. The module now owns `StoredImage` schemas, operation-specific result schemas, the image storage interface object factory, and an in-memory adapter for seam-level tests. No production callers were migrated in this slice.

Verification:

- Targeted image-storage tests pass.
- Targeted image-storage TypeScript check passes.
- Targeted image-storage ESLint check passes.
- Full Vitest suite passes.
- Full project TypeScript currently stops on an unrelated existing `DisplayControl` page-size type error.
