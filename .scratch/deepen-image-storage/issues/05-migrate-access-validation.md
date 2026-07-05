# Migrate access validation

Type: task
Status: ready-for-human

## Parent

.scratch/deepen-image-storage/PRD.md

## What to build

Move storage access and CORS validation onto the image storage interface. Validation should report typed outcomes for success, failed access, and incomplete CORS permissions.

The UI should continue to show the same validation states, but it should no longer depend on raw CORS provider responses.

## Acceptance criteria

- [ ] Access validation calls the image storage interface rather than provider-client CORS methods directly.
- [ ] The storage result distinguishes failed access from incomplete CORS permissions.
- [ ] Allowed and missing methods are preserved for the existing UI.
- [ ] Existing validation UI states remain unchanged from a user's perspective.
- [ ] Tests cover valid access, failed access, no CORS result, incomplete CORS methods, wildcard origins, and wildcard headers.

## Blocked by

- .scratch/deepen-image-storage/issues/01-create-image-storage-contract.md
