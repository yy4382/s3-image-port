import {
  settingsForSyncAtom,
  settingsForSyncSchema,
} from "../../settings-store";
import { z } from "zod";
import { atom, SetStateAction } from "jotai";
import {
  canSyncAtom,
  syncStateAtom,
  syncStateSchema,
  syncTokenAtom,
} from "../sync-store";
import deepEqual from "deep-equal";
import { settingsRecordSchema } from "../types";
import {
  uploadProfiles,
  fetchRemoteProfiles,
  UploadProfileError,
} from "../sync-api-client";
import type { DiscriminatedUnion } from "@/lib/utils/type-utils";
import { assertUnreachable } from "@/lib/utils/assert-unreachable";

type ResolvedConflict = "local" | "remote";

type ConflictResolver = (params: {
  local: z.infer<typeof settingsForSyncSchema>;
  remote: z.infer<typeof settingsRecordSchema>;
}) => Promise<ResolvedConflict | null>;

type ConfirmPull = (
  data: Extract<SyncAction, { _tag: SyncActionType.PULL }>["data"],
) => Promise<boolean>;

export type UserConfirmations = {
  conflictResolver: ConflictResolver;
  confirmPull: ConfirmPull;
};

type SyncState = {
  readonly local: z.infer<typeof settingsForSyncSchema>;
  readonly config: z.infer<typeof syncStateSchema>;
  readonly remote: z.infer<typeof settingsRecordSchema>;
};

type SyncResult = {
  local?: SetStateAction<z.infer<typeof settingsForSyncSchema>>;
  config?: SetStateAction<z.infer<typeof syncStateSchema>>;
};

enum SyncDiffType {
  NOT_INITIALIZED = "NOT_INITIALIZED",
  NOT_CHANGED = "NOT_CHANGED",
  NEED_PULL = "NEED_PULL",
  NEED_PUSH = "NEED_PUSH",
  CONFLICT = "CONFLICT",
}

type SyncDiffState = DiscriminatedUnion<
  "_tag",
  {
    [SyncDiffType.NOT_INITIALIZED]: { data: Omit<SyncState, "remote"> };
    [SyncDiffType.NOT_CHANGED]: { data: SyncState };
    [SyncDiffType.NEED_PULL]: { data: SyncState };
    [SyncDiffType.NEED_PUSH]: { data: SyncState };
    [SyncDiffType.CONFLICT]: { data: SyncState };
  }
>;

export enum SyncActionType {
  PULL = "PULL",
  PUSH = "PUSH",
  INIT_REMOTE = "INIT_REMOTE",
  NOT_CHANGED = "NOT_CHANGED",
  CONFLICT = "CONFLICT",
  DO_NOTHING = "DO_NOTHING",
}
type SyncAction = DiscriminatedUnion<
  "_tag",
  {
    [SyncActionType.INIT_REMOTE]: { data: Omit<SyncState, "remote"> };
    [SyncActionType.PUSH]: { data: SyncState };
    [SyncActionType.PULL]: { data: SyncState };
    [SyncActionType.NOT_CHANGED]: { data: SyncState };
    [SyncActionType.CONFLICT]: {
      data: SyncState & { resolvedConflict: ResolvedConflict };
    };
    [SyncActionType.DO_NOTHING]: { data?: never };
  }
>;

export const syncServiceAtom = atom(
  null,
  async (get, set, userConfirmations: UserConfirmations) => {
    const canSync = get(canSyncAtom);
    if (!canSync) {
      return;
    }

    const config = get(syncStateAtom);
    const local = get(settingsForSyncAtom);
    const token = get(syncTokenAtom);
    const result = await sync({ local, config, token }, userConfirmations);
    if (result.config) {
      set(syncStateAtom, result.config);
    }
    if (result.local) {
      set(settingsForSyncAtom, result.local);
    }
    return result.actionType;
  },
);

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
  userConfirmations: UserConfirmations,
): Promise<SyncResult & { actionType: SyncActionType }> => {
  const serverSettings = await fetchRemoteProfiles(token);
  const diffType = detectSyncDiff({ local, config, remote: serverSettings });
  const action = await userConfirm(diffType, userConfirmations);
  const actionActors = await performSyncAction(action, { token });
  return { ...actionActors, actionType: action._tag };
};

/**
 * Detects the sync diff state between the local and remote data.
 *
 * @param state - The current sync state
 * @returns The detected sync diff state
 */
function detectSyncDiff(state: {
  local: SyncState["local"];
  config: SyncState["config"];
  remote: SyncState["remote"] | null;
}): SyncDiffState {
  const { local, config, remote } = state;

  // remote is not initialized, we need to push
  if (remote === null) {
    return { _tag: SyncDiffType.NOT_INITIALIZED, data: state };
  }

  const stateNotNull: SyncState = { ...state, remote };
  function returnNotNull(tag: SyncDiffType): SyncDiffState {
    return { _tag: tag, data: stateNotNull };
  }

  // local and remote are the same, no changes
  if (deepEqual(remote.data, local)) {
    return returnNotNull(SyncDiffType.NOT_CHANGED);
  }

  // local is not dirty (and remote - local aren't same), we need to pull
  if (deepEqual(local, config.lastUpload)) {
    return returnNotNull(SyncDiffType.NEED_PULL);
  }

  // local is dirty (and remote - local aren't same), we need to push
  if (
    deepEqual(config.lastUpload, remote.data) &&
    config.version === remote.version
  ) {
    return returnNotNull(SyncDiffType.NEED_PUSH);
  }

  return returnNotNull(SyncDiffType.CONFLICT);
}

/**
 * Transforms a SyncDiffState into a SyncAction, by asking the user for confirmation if needed.
 * @param diffState
 * @returns SyncAction
 */
async function userConfirm(
  diffState: SyncDiffState,
  { conflictResolver, confirmPull }: UserConfirmations,
): Promise<SyncAction> {
  switch (diffState._tag) {
    case SyncDiffType.NOT_INITIALIZED: {
      return { _tag: SyncActionType.INIT_REMOTE, data: diffState.data };
    }
    case SyncDiffType.NOT_CHANGED: {
      return { _tag: SyncActionType.NOT_CHANGED, data: diffState.data };
    }
    case SyncDiffType.NEED_PULL: {
      const confirmed = await confirmPull(diffState.data);
      if (!confirmed) {
        return { _tag: SyncActionType.DO_NOTHING };
      }
      return { _tag: SyncActionType.PULL, data: diffState.data };
    }
    case SyncDiffType.NEED_PUSH: {
      return { _tag: SyncActionType.PUSH, data: diffState.data };
    }
    case SyncDiffType.CONFLICT: {
      const resolvedConflict = await conflictResolver({
        local: diffState.data.local,
        remote: diffState.data.remote,
      });
      switch (resolvedConflict) {
        case null: {
          return { _tag: SyncActionType.DO_NOTHING };
        }
        default: {
          return {
            _tag: SyncActionType.CONFLICT,
            data: { ...diffState.data, resolvedConflict },
          };
        }
      }
    }
    /* v8 ignore next */
    default: {
      return assertUnreachable(diffState);
    }
  }
}

/**
 * Performs the sync action.
 *
 * @param type - The sync action to perform
 * @param { token: string } - The sync token
 * @returns The result of the sync action
 */
async function performSyncAction(
  type: SyncAction,
  { token }: { token: string },
): Promise<SyncResult> {
  switch (type._tag) {
    case SyncActionType.INIT_REMOTE: {
      const { local } = type.data;
      const data = await uploadProfiles(local, token, 0);
      if (data.success) {
        return {
          config: (prev) => ({
            ...prev,
            version: data.current.version,
            lastUpload: local,
          }),
        };
      }
      throw new UploadProfileError(data.error);
    }
    case SyncActionType.PUSH: {
      const { local, config } = type.data;
      const data = await uploadProfiles(local, token, config.version);
      if (data.success) {
        return {
          config: (prev) => ({
            ...prev,
            version: data.current.version,
            lastUpload: local,
          }),
        };
      }
      throw new UploadProfileError(data.error);
    }
    case SyncActionType.PULL: {
      const { remote } = type.data;
      return {
        config: (prev) => ({
          ...prev,
          version: remote.version,
          lastUpload: remote.data,
        }),
        local: remote.data,
      };
    }
    case SyncActionType.NOT_CHANGED: {
      const { remote } = type.data;
      return {
        config: (prev) => ({
          ...prev,
          version: remote.version,
          lastUpload: remote.data,
        }),
      };
    }
    case SyncActionType.CONFLICT: {
      return handleConflict(type, { token });
    }
    case SyncActionType.DO_NOTHING: {
      return {};
    }
    /* v8 ignore next */
    default: {
      return assertUnreachable(type);
    }
  }
}

async function handleConflict(
  { data }: Extract<SyncAction, { _tag: SyncActionType.CONFLICT }>,
  { token }: { token: string },
): Promise<SyncResult> {
  const resolvedConflict = data.resolvedConflict;
  switch (resolvedConflict) {
    case "local": {
      const uploadedData = await uploadProfiles(
        data.local,
        token,
        data.remote.version,
      );
      if (uploadedData.success) {
        return {
          config: (prev) => ({
            ...prev,
            version: uploadedData.current.version,
            lastUpload: data.local,
          }),
        };
      }
      throw new UploadProfileError(uploadedData.error);
    }
    case "remote": {
      return {
        local: data.remote.data,
        config: (prev) => ({
          ...prev,
          version: data.remote.version,
          lastUpload: data.remote.data,
        }),
      };
    }
    /* v8 ignore next */
    default: {
      return assertUnreachable(resolvedConflict);
    }
  }
}
