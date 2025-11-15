import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { z } from "zod";
import { SYNC_TOKEN_STORAGE_KEY } from "@/lib/encryption/sync-token";
import { settingsForSyncSchema } from "../settings-store";

// Sync configuration stored in localStorage
export const syncStateSchema = z.object({
  enabled: z.boolean().default(false),
  version: z.number().default(0),
  lastUpload: settingsForSyncSchema.nullable().default(null),
});

// Persisted sync configuration
export const syncStateAtom = atomWithStorage<z.infer<typeof syncStateSchema>>(
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

// Sync status
export type SyncStatus = "idle" | "uploading" | "pulling" | "error";

export const syncStatusAtom = atom<SyncStatus>("idle");

// Last sync error
export const syncErrorAtom = atom<string | null>(null);

export const canSyncAtom = atom((get) => {
  const config = get(syncStateAtom);
  const token = get(syncTokenAtom);
  return config.enabled && token.trim().length > 0;
});
