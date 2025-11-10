import {
  syncSettingsStoreAtom,
  syncSettingsStoreSchema,
} from "../settings-store";
import { z } from "zod";
import { atom, SetStateAction } from "jotai";
import {
  canSyncAtom,
  syncConfigAtom,
  syncConfigSchema,
  syncTokenAtom,
} from "./sync-store";
import deepEqual from "deep-equal";
import { settingsInDbSchema } from "./types";
import { uploadProfiles, fetchRemoteProfiles } from "./sync-api-client";

type ConflictResolver = (params: {
  local: z.infer<typeof syncSettingsStoreSchema>;
  remote: z.infer<typeof settingsInDbSchema>;
}) => Promise<"local" | "remote" | null>;

type SyncResult = {
  local?: SetStateAction<z.infer<typeof syncSettingsStoreSchema>>;
  config?: SetStateAction<z.infer<typeof syncConfigSchema>>;
};

export const sync = async (
  {
    local,
    config,
    token,
  }: {
    readonly local: z.infer<typeof syncSettingsStoreSchema>;
    readonly config: z.infer<typeof syncConfigSchema>;
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
        };
      }
      if (data.conflict) {
        throw new Error("Race condition, retry later");
      }
      throw new Error("Upload failed");
    }
    case null: {
      return {};
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

    const config = get(syncConfigAtom);
    const local = get(syncSettingsStoreAtom);
    const token = get(syncTokenAtom);
    const result = await sync({ local, config, token }, { conflictResolver });
    if (result.config) {
      set(syncConfigAtom, result.config);
    }
    if (result.local) {
      set(syncSettingsStoreAtom, result.local);
    }
  },
);
