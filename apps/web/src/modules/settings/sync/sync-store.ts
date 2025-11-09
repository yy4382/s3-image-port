import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { z } from "zod";
import { SYNC_TOKEN_STORAGE_KEY } from "@/lib/encryption/sync-token";

// Sync configuration stored in localStorage
const _syncConfigSchema = z.object({
  enabled: z.boolean(),
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

// Persisted sync token in localStorage
// This token encrypts profiles before they leave the browser. Keeping it
// locally mirrors the existing plaintext storage of profiles and makes the
// UX practical without reducing security.
export const syncTokenAtom = atomWithStorage<string>(
  SYNC_TOKEN_STORAGE_KEY,
  "",
  undefined,
  {
    getOnInit: true,
  },
);

// Temporary alias until UI is refactored.
export const syncPassphraseAtom = syncTokenAtom;

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
  const token = get(syncTokenAtom);
  return config.enabled && token.trim().length > 0;
});
