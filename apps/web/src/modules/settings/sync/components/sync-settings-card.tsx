"use client";

/**
 * The sync UI is intentionally left blank until we redesign the flow around the
 * new mnemonic-based token APIs.
 *
 * Suggested building blocks (see `@/lib/encryption/sync-token` and
 * `../sync-service`):
 * 1. Generate or import a token with `createSyncToken` / `normalizeSyncToken`.
 * 2. Persist it via `syncTokenAtom` (atomWithStorage) and display a preview via
 *    `getTokenPreview`.
 * 3. Use `uploadProfiles`, `fetchRemoteProfiles`, and `deleteRemoteProfiles`
 *    with the token to keep server data in sync.
 * 4. Toggling sync can be as simple as flipping `syncConfigAtom.enabled`
 *    alongside writing/clearing the token atom.
 */
export function SyncSettingsCard() {
  return null;
}
