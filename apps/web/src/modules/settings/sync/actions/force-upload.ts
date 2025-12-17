import { z } from "zod";
import { SetStateAction } from "jotai";
import { settingsForSyncSchema } from "@/stores/schemas/settings";
import { syncStateSchema } from "../sync-store";
import deepEqual from "deep-equal";
import {
  uploadProfiles,
  fetchRemoteProfiles,
  UploadProfileError,
} from "../sync-api-client";

type ForceUploadResult = {
  config?: SetStateAction<z.infer<typeof syncStateSchema>>;
};

/**
 * Force uploads the local profile to the remote server, overwriting any remote changes.
 *
 * @param local - The local settings to upload
 * @param token - The sync token for authentication
 * @returns The updated sync config state updater
 * @throws {UploadProfileError} If the upload fails
 */
export async function forceUpload(
  local: z.infer<typeof settingsForSyncSchema>,
  token: string,
): Promise<ForceUploadResult> {
  const remote = await fetchRemoteProfiles(token);

  // If remote profile exists and is identical to local, no need to upload
  if (remote && deepEqual(local, remote.data)) {
    return {
      config: (prev) => ({
        ...prev,
        version: remote.version,
        lastUpload: remote.data,
      }),
    };
  }

  // Upload the local profile with force flag
  const result = await uploadProfiles(local, token, "force");

  if (!result.success) {
    throw new UploadProfileError(result.error);
  }

  return {
    config: (prev) => ({
      ...prev,
      version: result.current.version,
      lastUpload: result.current.data,
    }),
  };
}
