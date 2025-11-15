import { settingsForSyncAtom, settingsForSyncSchema } from "../settings-store";
import { z } from "zod";
import { atom, SetStateAction } from "jotai";
import {
  canSyncAtom,
  syncStateAtom,
  syncStateSchema,
  syncTokenAtom,
} from "./sync-store";
import deepEqual from "deep-equal";
import { settingsRecordSchema } from "./types";
import { uploadProfiles, fetchRemoteProfiles } from "./sync-api-client";

type ConflictResolver = (params: {
  local: z.infer<typeof settingsForSyncSchema>;
  remote: z.infer<typeof settingsRecordSchema>;
}) => Promise<"local" | "remote" | null>;

type SyncActionType =
  | "push"
  | "pull"
  | "not-changed"
  | "conflict-push"
  | "conflict-pull"
  | "conflict-cancel";
type SyncResult = {
  local?: SetStateAction<z.infer<typeof settingsForSyncSchema>>;
  config?: SetStateAction<z.infer<typeof syncStateSchema>>;
  action: SyncActionType;
};

export const sync = async (
  {
    local,
    config,
    token,
  }: {
    readonly local: z.infer<typeof settingsForSyncSchema>;
    readonly config: z.infer<typeof syncStateSchema>;
    readonly token: string;
  },
  { conflictResolver }: { conflictResolver: ConflictResolver },
): Promise<SyncResult> => {
  const serverSettings = await fetchRemoteProfiles(token);
  if (serverSettings === null) {
    const data = await uploadProfiles(local, token, 0);
    if (data.success) {
      return {
        config: (prev) => ({
          ...prev,
          version: data.version,
          lastUpload: local,
        }),
        action: "push",
      };
    }
    throw new Error("Upload failed");
  }

  // server == local
  if (deepEqual(serverSettings.data, local)) {
    return {
      config: (prev) => ({
        ...prev,
        version: serverSettings.version,
        lastUpload: serverSettings.data,
      }),
      action: "not-changed",
    };
  }

  // local is not dirty
  if (deepEqual(local, config.lastUpload)) {
    return {
      config: (prev) => ({
        ...prev,
        version: serverSettings.version,
        lastUpload: serverSettings.data,
      }),
      local: serverSettings.data,
      action: "pull",
    };
  }

  if (
    deepEqual(config.lastUpload, serverSettings.data) &&
    config.version === serverSettings.version
  ) {
    const data = await uploadProfiles(local, token, config.version);
    if (data.success) {
      return {
        config: (prev) => ({
          ...prev,
          version: data.version,
          lastUpload: local,
        }),
        action: "push",
      };
    }
    throw new Error("Upload failed");
  }
  // resolve conflict
  const result = await conflictResolver({
    local,
    remote: serverSettings,
  });
  switch (result) {
    case "remote": {
      return {
        local: serverSettings.data,
        config: (prev) => ({
          ...prev,
          version: serverSettings.version,
          lastUpload: serverSettings.data,
        }),
        action: "conflict-pull",
      };
    }
    case "local": {
      const data = await uploadProfiles(local, token, serverSettings.version);
      if (data.success) {
        return {
          config: (prev) => ({
            ...prev,
            version: data.version,
            lastUpload: local,
          }),
          action: "conflict-push",
        };
      }
      if (data.conflict) {
        throw new Error("Race condition, retry later");
      }
      throw new Error("Upload failed");
    }
    case null: {
      return {
        action: "conflict-cancel",
      };
    }
  }
};

export const syncServiceAtom = atom(
  null,
  async (get, set, conflictResolver: ConflictResolver) => {
    const canSync = get(canSyncAtom);
    if (!canSync) {
      return;
    }

    const config = get(syncStateAtom);
    const local = get(settingsForSyncAtom);
    const token = get(syncTokenAtom);
    const result = await sync({ local, config, token }, { conflictResolver });
    if (result.config) {
      set(syncStateAtom, result.config);
    }
    if (result.local) {
      set(settingsForSyncAtom, result.local);
    }
  },
);
