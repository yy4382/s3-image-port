# Behavioral baseline and deterministic harness evidence

## Evidence frame

- Implementation revision: `ff76310`, whose tracked application/manifests are byte-for-byte `88bda7e`; `ff76310` adds planning artifacts only.
- Ordinary behavior oracle: `main` at `72e942667f2fe31b047dae663e4f5484964983c4`.
- The eight intentional deviations are exactly those in the reapplication inventory: ordinary storage edits do not relist; target mismatch blocks old-target work; uploads survive the route and integrate immediately; refresh/navigation join; listings cannot undo confirmed facts; overlapping mutations are blocked; upload editing locks during work; and genuine profile replacement clears exactly once.
- No live S3 request was made. The checked-in dependency graph first needed `CI=true pnpm install --frozen-lockfile` because the workspace links were absent; the frozen install changed no manifest or lockfile.

## Untouched base result

`pnpm --dir apps/web test --run` passed before any test helper was added: **15 files, 174 tests**.

| Area                       | Untouched suites                                                    | Result                                                                                                   |
| -------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Settings persistence/cache | `atomWithStorageMigration.test.ts`, `stores/atoms/settings.test.ts` | 45 passed                                                                                                |
| Profiles and forms         | `profiles.test.tsx`, `s3.test.tsx`, `setting-input.test.tsx`        | 50 passed                                                                                                |
| Gallery derivation/actions | `use-photo-list.test.tsx`, `photo-actions.test.tsx`                 | 11 passed                                                                                                |
| Upload                     | `upload-queue-machine.test.ts`, `upload.test.tsx`                   | 16 passed                                                                                                |
| Sync                       | `sync.test.ts`                                                      | 11 passed                                                                                                |
| Image-storage boundary     | schema, memory behavior, S3 adapter, and access-test suites         | 30 passed                                                                                                |
| URL/modal                  | No dedicated automated suite exists at this base revision           | Recorded coverage gap; `main` stays the oracle until the URL slice adds its accepted cases               |
| Natural-size cache         | No dedicated automated suite exists at this base revision           | Recorded coverage gap; the retained Jotai/plain behavior must be characterized before its closeout slice |

The remaining 11 passing tests are the encryption suite. Expected diagnostic stderr from corrupt-settings cases, the rate-limit fallback, and the known Base UI native-button warning did not fail the baseline.

## Test-only controls

- `deterministic.ts`: deferred resolve/reject, stable IDs, ten-microtask draining, and optional timer settling.
- `image-storage.ts`: one counted `createStorage` seam and distinct arguments/counts for all seven remote methods, with per-method deferred overrides.
- `storage.ts`: an injectable browser `Storage` with separately counted reads, writes, removes, clears, and controllable failures.
- `react.tsx`: StrictMode mounting, render/commit counts, and idempotent subscription cleanup counts.
- `browser.ts`: restorable `ResizeObserver` and animation-frame controls with observable cleanup.

Their tests prove listing/mutation completion in both orders and that adapter, remote, persistence, render/commit, observer, and frame counters do not continue changing after ten drained microtasks and relevant timers. Production has no import from `src/test` and no runtime/effect bag was added.

## Red to green and final gates

Each helper began with a focused test importing a missing module. These commands failed red with `Failed to resolve import` before the corresponding implementation was added, then passed green:

- `pnpm --dir apps/web test --run src/test/helpers/deterministic.test.ts`
- `pnpm --dir apps/web test --run src/test/helpers/image-storage.test.ts`
- `pnpm --dir apps/web test --run src/test/helpers/storage.test.ts`
- `pnpm --dir apps/web test --run src/test/helpers/react.test.tsx`
- `pnpm --dir apps/web test --run src/test/helpers/browser.test.tsx`

Final results:

- `pnpm --dir apps/web test --run src/test/helpers` — **5 files, 9 tests passed**.
- `pnpm --dir apps/web test --run` — **20 files, 183 tests passed**; the original 174 remain green.
- `pnpm --dir apps/web exec tsc --noEmit` — passed.
- `pnpm --dir apps/web lint` — passed.
- `pnpm --dir apps/web build` — passed, including client, SSR, Nitro, and 15 prerendered pages.

## Limits carried forward

- This slice records—not closes—the missing URL/modal and natural-size base coverage. Their behavior-level suites belong to the slices that are allowed to touch those seams.
- Deterministic adapters are race evidence, not a credentialed S3 smoke test.
- No accepted correction is implemented here; the base's known excess listing, route-local upload lifetime, whole-selection rerenders, and unsafe old-target actions are not desirable characterizations.
