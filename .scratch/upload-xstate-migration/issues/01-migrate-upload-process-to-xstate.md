Status: resolved

# Migrate upload process to XState

Implement the PRD in `.scratch/upload-xstate-migration/PRD.md`.

## Acceptance Criteria

- `apps/web/src/modules/upload` no longer uses Jotai atoms for upload queue or pending-upload lifecycle state.
- The upload page uses XState actors/selectors for queue membership and per-item status.
- Existing user-visible upload behavior is preserved.
- Focused upload tests pass.
- Full typecheck, lint, and test suite pass before final review.

## Answer

Implemented with an upload queue actor that spawns one pending-upload actor per queued file. The upload page now uses XState actor selectors/events for upload queue state while settings and gallery invalidation remain injected at the React seam. Verified with focused upload machine/component tests, TypeScript, ESLint, and the full Vitest suite.
