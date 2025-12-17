import { z } from "zod";
import { SetStateAction } from "jotai";
import { settingsForSyncSchema } from "@/stores/schemas/settings";
import { syncStateSchema } from "../sync-store";
import { fetchRemoteProfiles } from "../sync-api-client";

type ForcePullResult = {
  local?: SetStateAction<z.infer<typeof settingsForSyncSchema>>;
  config?: SetStateAction<z.infer<typeof syncStateSchema>>;
};

/**
 * Force pulls the remote profile to the local device, overwriting any local changes.
 *
 * @param token - The sync token for authentication
 * @returns The state updaters for local settings and sync config
 * @throws {Error} If the remote profile cannot be fetched
 */
export async function forcePull(token: string): Promise<ForcePullResult> {
  const result = await fetchRemoteProfiles(token);

  if (!result) {
    throw new Error("No corresponding profile found on the server");
  }

  return {
    local: result.data,
    config: (prev) => ({
      ...prev,
      version: result.version,
      lastUpload: result.data,
    }),
  };
}
