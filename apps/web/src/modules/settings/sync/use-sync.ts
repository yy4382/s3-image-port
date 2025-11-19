import { useRef, useState } from "react";
import { useTranslations } from "use-intl";
import {
  queryOptions,
  useMutation,
  useMutationState,
} from "@tanstack/react-query";
import { fetchMetadata, UploadProfileError } from "./sync-api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import {
  SyncActionType,
  syncServiceAtom,
  UserConfirmations,
} from "./actions/sync";
import { toast } from "sonner";
import { assertUnreachable } from "@/lib/utils/assert-unreachable";

export const remoteMetadataQuery = Object.assign(
  (params: { token: string; enabled: boolean }) =>
    queryOptions({
      queryKey: ["remote-metadata"],
      queryFn: () => fetchMetadata(params.token),
      enabled: params.enabled && !!params.token,
    }),
  {
    queryKey: ["remote-metadata"],
  },
);

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export function useConfirmation<TData extends {}, TResult>() {
  const [data, setData] = useState<TData | null>(null);
  const resolveRef = useRef<((value: TResult) => void) | null>(null);

  const confirm = (confirmData: TData): Promise<TResult> => {
    return new Promise<TResult>((resolve) => {
      setData(confirmData);
      resolveRef.current = resolve;
    });
  };

  const resolve = (value: TResult) => {
    resolveRef.current?.(value);
    setData(null);
    resolveRef.current = null;
  };

  return {
    data,
    confirm,
    resolve,
    isOpen: data !== null,
  };
}
export function useToastUploadProfileError() {
  const t = useTranslations("settings.sync");
  const toastError = function (error: UploadProfileError) {
    const cause = error.cause;
    switch (cause.code) {
      case "INPUT_VALIDATION_FAILED": {
        toast.error(t("toasts.errors.invalidInput"));
        return;
      }
      case "PAYLOAD_TOO_LARGE": {
        toast.error(t("toasts.errors.payloadTooLarge"));
        return;
      }
      case "CONFLICT": {
        toast.error(t("toasts.errors.conflict"));
        return;
      }
      case "TOO_MANY_REQUESTS": {
        const retryAfterMs = Math.max(0, cause.data.reset - Date.now());
        const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
        toast.error(t("toasts.errors.tooManyRequests", { seconds }));
        return;
      }
      default: {
        assertUnreachable(cause);
      }
    }
  };
  return toastError;
}

const syncMutationKey = ["profile-sync"];
export function useSync() {
  const t = useTranslations("settings.sync");
  const queryClient = useQueryClient();
  const toastUploadProfileError = useToastUploadProfileError();
  const sync = useSetAtom(syncServiceAtom);

  const confirmPull = useConfirmation<
    Parameters<UserConfirmations["confirmPull"]>[0],
    boolean
  >();

  const confirmConflict = useConfirmation<
    Parameters<UserConfirmations["conflictResolver"]>[0],
    "local" | "remote" | null
  >();

  const syncMutation = useMutation({
    mutationKey: ["sync"],
    mutationFn: () =>
      sync({
        conflictResolver: confirmConflict.confirm,
        confirmPull: confirmPull.confirm,
      }),
    scope: {
      id: "profile-sync",
    },
    onError: (error) => {
      if (error instanceof UploadProfileError) {
        toastUploadProfileError(error);
      } else {
        toast.error(error.message ?? t("toasts.syncFailed"));
      }
    },
    onSuccess: (data) => {
      if (!data) {
        toast.error(t("toasts.syncFailed"));
      } else if (data === SyncActionType.NOT_CHANGED) {
        toast.success(t("toasts.noChanges"));
      } else if (data !== SyncActionType.DO_NOTHING) {
        toast.success(t("toasts.syncCompleted"));
      }
      if (
        data &&
        data !== SyncActionType.DO_NOTHING &&
        data !== SyncActionType.NOT_CHANGED
      ) {
        queryClient.invalidateQueries({
          queryKey: remoteMetadataQuery.queryKey,
        });
      }
    },
  });

  return {
    syncMutation,
    confirmPull,
    confirmConflict,
  };
}

export function useSyncMutationStatus() {
  const data = useMutationState({
    filters: { mutationKey: syncMutationKey },
    select: (state) => state.state.status,
  });
  // since we have filter and scope id for this mutation, there should be only one item in the array
  return data.at(0);
}
