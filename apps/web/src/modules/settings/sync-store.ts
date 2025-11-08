import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { z } from "zod";

// Sync configuration stored in localStorage
const _syncConfigSchema = z.object({
  enabled: z.boolean(),
  userId: z.string().optional(),
  lastUpload: z.number().optional(),
  lastPull: z.number().optional(),
  version: z.number().default(0),
});

export type SyncConfig = z.infer<typeof _syncConfigSchema>;

// Persisted sync configuration
export const syncConfigAtom = atomWithStorage<SyncConfig>(
  "s3ip:sync-config",
  {
    enabled: false,
    version: 0,
  },
  undefined,
  { getOnInit: true },
);

// Persisted passphrase in localStorage
// Note: This is stored in localStorage because the unencrypted profiles
// are already there. The passphrase encrypts data sent to the server,
// but local data is not encrypted. Storing the passphrase improves UX
// without reducing security since an attacker with localStorage access
// already has the unencrypted profiles.
export const syncPassphraseAtom = atomWithStorage<string>(
  "s3ip:sync-passphrase",
  "",
  undefined,
  { getOnInit: true },
);

// Remote sync info fetched from server
export interface RemoteSyncInfo {
  exists: boolean;
  version?: number;
  updatedAt?: number;
}

export const remoteSyncInfoAtom = atom<RemoteSyncInfo>({
  exists: false,
});

// Sync status
export type SyncStatus = "idle" | "uploading" | "pulling" | "error";

export const syncStatusAtom = atom<SyncStatus>("idle");

// Last sync error
export const syncErrorAtom = atom<string | null>(null);

// Helper atoms
export const isSyncEnabledAtom = atom((get) => get(syncConfigAtom).enabled);

export const canSyncAtom = atom((get) => {
  const config = get(syncConfigAtom);
  const passphrase = get(syncPassphraseAtom);
  return config.enabled && !!config.userId && passphrase.length > 0;
});
