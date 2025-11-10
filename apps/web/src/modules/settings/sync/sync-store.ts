import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { z } from "zod";
import { SYNC_TOKEN_STORAGE_KEY } from "@/lib/encryption/sync-token";
import { syncSettingsStoreSchema } from "../settings-store";

// Sync configuration stored in localStorage
export const syncConfigSchema = z.object({
  enabled: z.boolean().default(false),
  version: z.number().default(0),
  lastUpload: syncSettingsStoreSchema.nullable().default(null),
});

// Persisted sync configuration
export const syncConfigAtom = atomWithStorage<z.infer<typeof syncConfigSchema>>(
  "s3ip:sync-config",
  {
    enabled: false,
    version: 0,
    lastUpload: null,
  },
);

// Persisted sync token in localStorage
// This token encrypts profiles before they leave the browser. Keeping it
// locally mirrors the existing plaintext storage of profiles and makes the
// UX practical without reducing security.
export const syncTokenAtom = atomWithStorage<string>(
  SYNC_TOKEN_STORAGE_KEY,
  "",
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

export const canSyncAtom = atom((get) => {
  const config = get(syncConfigAtom);
  const token = get(syncTokenAtom);
  return config.enabled && token.trim().length > 0;
});
