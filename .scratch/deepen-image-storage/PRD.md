# PRD: Deepen Image Storage

Status: implemented

## Problem Statement

S3 Image Port currently exposes storage-provider details through upload, gallery, download, delete, rename, and validation flows. Callers construct storage clients directly, handle raw provider responses, parse thrown error messages, and duplicate storage assumptions across UI-facing modules.

This makes stored image behavior harder to change and harder to test. A user-visible action such as renaming or listing stored images depends on a shallow storage interface whose implementation leaks through multiple callers.

## Solution

Introduce a deep image storage module for stored-image operations. The module exposes one storage interface object created from validated settings. Callers use stored-image behavior, not raw provider operations.

Expected storage outcomes are represented as typed result objects defined by Zod schemas owned by the image storage module. Production uses an S3-compatible adapter behind the module. Tests use an in-memory adapter behind the same seam.

The storage seam covers stored-image operations only. Gallery catalog behavior such as filtering, sorting, pagination, selection, search parameters, and refresh policy remains outside this module.

## User Stories

1. As a user, I want the gallery to list stored images from my configured bucket, so that I can manage images I already uploaded.
2. As a user, I want stored image URLs to be derived consistently, so that copied and displayed links match my storage settings.
3. As a user, I want upload to use the same storage behavior as gallery actions, so that upload failures are handled consistently.
4. As a user, I want stored image deletion to report expected failures clearly, so that I understand whether deletion succeeded.
5. As a user, I want batch deletion to handle multiple stored images consistently, so that partial or failed work is not hidden.
6. As a user, I want stored image rename to detect an existing target key, so that I do not overwrite data accidentally.
7. As a user, I want forced rename to be explicit, so that overwriting a target stored image is intentional.
8. As a user, I want partial rename outcomes to be represented clearly, so that I know when copy succeeded but cleanup failed.
9. As a user, I want download to return usable stored image data, so that the browser can save the image without knowing provider response details.
10. As a user, I want access validation to distinguish connection failure from incomplete CORS permissions, so that configuration problems are actionable.
11. As a user, I want CORS validation to report allowed methods, so that I can fix only the missing permissions.
12. As a user, I want access-denied and not-found states to be distinct, so that I can debug credentials separately from keys.
13. As a maintainer, I want storage callers to cross one seam, so that storage behavior has locality.
14. As a maintainer, I want expected storage failures to be values, so that callers do not parse provider error strings.
15. As a maintainer, I want Zod schemas for stored image results, so that runtime contracts and inferred types stay together.
16. As a maintainer, I want S3-specific behavior isolated in an adapter, so that provider-specific changes do not spread.
17. As a maintainer, I want an in-memory adapter for tests, so that storage behavior can be exercised without provider mocks.
18. As a maintainer, I want the old direct storage client surface removed, so that future code does not bypass the deep module.

## Implementation Decisions

- The seam is image-object storage: list, upload, delete, rename, download, probe, and access validation for stored images.
- Gallery catalog behavior is out of the storage module. Search, sorting, date filtering, prefix filtering, pagination, selection, and refresh policy remain separate.
- The canonical domain term is `Stored image`.
- Storage-facing and gallery data should use `StoredImage`; user-facing route names, labels, and translation keys do not need cosmetic renaming.
- The image storage module owns Zod schemas and exports inferred types from those schemas.
- Expected storage failures are typed result objects. Thrown exceptions are reserved for programmer errors or impossible states.
- The storage module exposes a single interface object created from validated settings.
- Upload must use the same image storage module, but compression and key policy remain outside storage.
- The existing public storage client should become an internal S3-compatible adapter behind the storage interface.
- The module lives in the product module area, not as generic utility code.
- The implementation should be staged to reduce regression risk.

## Testing Decisions

- The interface is the test surface. Tests should assert behavior through the image storage module, not through raw provider calls.
- Result schemas should have direct tests for success and expected failure variants.
- The in-memory adapter should support module-level tests without network, provider credentials, or AWS SDK mocks.
- The S3-compatible adapter should have focused tests around provider response mapping: listing, upload metadata, rename conflict, partial rename, CORS methods, access denial, not found, and unknown failures.
- Gallery and upload tests should move away from direct provider-client mocks as their callers migrate to the image storage seam.
- Existing upload atom tests and gallery hooks provide prior art for behavior coverage, but should stop depending on shallow storage internals.

## Out of Scope

- Changing UI copy, route names, or translation keys from photo to image.
- Reworking gallery catalog behavior such as filtering, sorting, pagination, and selection.
- Changing upload compression behavior.
- Changing upload key-template policy.
- Adding support for storage providers beyond the existing S3-compatible settings model.
- Changing how users configure S3-compatible credentials.

## Further Notes

Implementation was completed on `codex/deepen-image-storage` across the local issue slices. The image storage module now owns the stored-image contract, typed Zod result schemas, the in-memory adapter, and the S3-compatible adapter. Upload, gallery listing, delete, rename, download, metadata probe, and access validation now cross the image storage seam instead of constructing the old provider client directly.
