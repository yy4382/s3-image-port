"use client";

import { Switch } from "@/components/animate-ui/radix/switch";
import { Button } from "@/components/ui/button";
import {
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isValidSyncToken } from "@/lib/encryption/sync-token";
import { useAtom, useSetAtom } from "jotai";
import {
  Key,
  Trash2,
  RefreshCwIcon,
  MoreVertical,
  Upload,
  Download,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  SyncActionType,
  syncServiceAtom,
  type UserConfirmations,
} from "../actions/sync";
import { syncStateAtom, syncTokenAtom } from "../sync-store";
import { TokenSetupDialog } from "./token-management/token-setup-dialog";
import { TokenViewerDialog } from "./token-management/token-viewer-dialog";
import { focusAtom } from "jotai-optics";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { fetchMetadata, UploadProfileError } from "../sync-api-client";
import { forceUpload } from "../actions/force-upload";
import { forcePull } from "../actions/force-pull";
import { deleteRemoteSync } from "../actions/delete";
import { format } from "date-fns";
import { ConfirmPullDialog } from "./confirm-dialogs/confirm-pull-dialog";
import { ConfirmDeleteDialog } from "./confirm-dialogs/confirm-delete-dialog";
import { ConfirmConflictDialog } from "./confirm-dialogs/confirm-conflict-dialog";
import { assertUnreachable } from "@/lib/utils/assert-unreachable";
import { settingsForSyncAtom } from "../../settings-store";
import { AutoResizeHeight } from "@/components/misc/auto-resize-height";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { EnableSyncDialog } from "./confirm-dialogs/enable-sync-dialog";

const remoteMetadataQuery = (params: { token: string; enabled: boolean }) =>
  queryOptions({
    queryKey: ["remote-metadata"],
    queryFn: () => fetchMetadata(params.token),
    enabled: params.enabled && !!params.token,
  });

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
function useConfirmation<TData extends {}, TResult>() {
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

export function SyncSettings() {
  const [syncConfig] = useAtom(syncStateAtom);
  const [syncToken] = useAtom(syncTokenAtom);

  const hasValidToken = isValidSyncToken(syncToken);

  return (
    <div className="flex flex-col gap-3">
      <CardHeader className="px-0">
        <CardTitle>Profile Sync</CardTitle>
        <CardDescription>
          Sync your settings across devices using end to end encrypted cloud
          storage
        </CardDescription>
        <CardAction>
          <SyncSwitch />
        </CardAction>
      </CardHeader>

      <AutoResizeHeight duration={0.1}>
        <AnimatePresence>
          {syncConfig.enabled && (
            <motion.div className="pb-1">
              <CardContent className="px-0">
                {!hasValidToken && <SyncTokenSetup />}
                {hasValidToken && <SyncActions />}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </AutoResizeHeight>
    </div>
  );
}

const isEnabledAtom = focusAtom(syncStateAtom, (optic) =>
  optic.prop("enabled"),
);

function SyncSwitch() {
  const [isEnabled, setIsEnabled] = useAtom(isEnabledAtom);
  const enableConfirm = useConfirmation<boolean, boolean>();
  const handleEnableChange = async (checked: boolean) => {
    if (checked) {
      const confirmed = await enableConfirm.confirm(checked);
      if (confirmed) {
        setIsEnabled(true);
        return;
      }
    }
    setIsEnabled(false);
  };
  return (
    <div className="py-2">
      <Switch checked={isEnabled} onCheckedChange={handleEnableChange} />
      <EnableSyncDialog
        open={enableConfirm.isOpen}
        onResolve={enableConfirm.resolve}
      />
    </div>
  );
}

function SyncTokenSetup() {
  const [, setSyncToken] = useAtom(syncTokenAtom);

  const [showTokenDialog, setShowTokenDialog] = useState(false);

  const handleTokenConfirm = (token: string) => {
    setSyncToken(token);
    toast.success("Sync enabled successfully");
  };

  return (
    <div className="space-y-3">
      <Button onClick={() => setShowTokenDialog(true)} variant="outline">
        <Key />
        Setup token
      </Button>
      <TokenSetupDialog
        open={showTokenDialog}
        onOpenChange={setShowTokenDialog}
        onTokenConfirm={handleTokenConfirm}
      />
    </div>
  );
}

function toastUploadProfileError(error: UploadProfileError) {
  const cause = error.cause;
  switch (cause.code) {
    case "INPUT_VALIDATION_FAILED": {
      toast.error("Invalid input when uploading local profile");
      return;
    }
    case "PAYLOAD_TOO_LARGE": {
      toast.error("Local profile is too large to upload");
      return;
    }
    case "CONFLICT": {
      toast.error(
        "Conflict when uploading local profile, might be uploading from other device at the same time. Please sync again",
      );
      return;
    }
    case "TOO_MANY_REQUESTS": {
      const retryAfterMs = Math.max(0, cause.data.reset - Date.now());
      toast.error(
        `Too many requests when uploading local profile. Try again in about ${Math.max(1, Math.ceil(retryAfterMs / 1000))} seconds.`,
      );
      return;
    }
    default: {
      assertUnreachable(cause);
    }
  }
}

function SyncActions() {
  const [syncConfig, setSyncConfig] = useAtom(syncStateAtom);
  const [syncToken, setSyncToken] = useAtom(syncTokenAtom);
  const { data: remoteMetadata } = useQuery(
    remoteMetadataQuery({ token: syncToken, enabled: syncConfig.enabled }),
  );
  const queryClient = useQueryClient();
  const [local, setLocal] = useAtom(settingsForSyncAtom);
  const [showTokenViewer, setShowTokenViewer] = useState(false);

  const sync = useSetAtom(syncServiceAtom);

  const confirmPull = useConfirmation<
    Parameters<UserConfirmations["confirmPull"]>[0],
    boolean
  >();

  const confirmConflict = useConfirmation<
    Parameters<UserConfirmations["conflictResolver"]>[0],
    "local" | "remote" | null
  >();

  const confirmDelete = useConfirmation<"", boolean>();

  const { mutate: syncMutation, isPending } = useMutation({
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
        toast.error(error.message ?? "Failed to sync");
      }
    },
    onSuccess: (data) => {
      if (!data) {
        toast.error("Failed to sync");
      } else if (data === SyncActionType.NOT_CHANGED) {
        toast.success("No changes to sync");
      } else if (data !== SyncActionType.DO_NOTHING) {
        toast.success("Sync completed");
      }
      if (
        data &&
        data !== SyncActionType.DO_NOTHING &&
        data !== SyncActionType.NOT_CHANGED
      ) {
        queryClient.invalidateQueries(
          remoteMetadataQuery({
            token: syncToken,
            enabled: syncConfig.enabled,
          }),
        );
      }
    },
  });
  const handleForceUpload = async () => {
    try {
      const result = await forceUpload(local, syncToken);
      if (result.config) {
        setSyncConfig(result.config);
      }
      toast.success("Local profile uploaded successfully");
      queryClient.invalidateQueries(
        remoteMetadataQuery({ token: syncToken, enabled: syncConfig.enabled }),
      );
    } catch (error) {
      if (error instanceof UploadProfileError) {
        return toastUploadProfileError(error);
      }
      toast.error("Failed to upload local profile");
      console.error("Failed to upload local profile", error);
    }
  };

  const handleForcePull = async () => {
    try {
      const result = await forcePull(syncToken);
      if (result.local) {
        setLocal(result.local);
      }
      if (result.config) {
        setSyncConfig(result.config);
      }
    } catch (error) {
      toast.error("Failed to fetch remote profile");
      console.error("Failed to fetch remote profile", error);
    }
  };

  const handleDeleteToken = () => {
    setSyncToken("");
    setSyncConfig({ enabled: true, version: 0, lastUpload: null });
    toast.info("Sync token cleared");
  };

  const handleDelete = async () => {
    const confirmed = await confirmDelete.confirm("");
    if (confirmed) {
      const result = await deleteRemoteSync(syncToken);
      if (result.success) {
        toast.success("Remote sync data deleted");
        try {
          await queryClient.invalidateQueries(
            remoteMetadataQuery({
              token: syncToken,
              enabled: syncConfig.enabled,
            }),
          );
        } finally {
          setSyncConfig({ enabled: true, version: 0, lastUpload: null });
        }
      } else if (result.reason === "no-such-user") {
        toast.error("No corresponding profile found on the server");
      } else {
        toast.error("Failed to delete remote sync data");
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-between">
        <div className="flex gap-2">
          <Button
            onClick={() => syncMutation()}
            disabled={isPending}
            variant="default"
          >
            <RefreshCwIcon className={cn(isPending && "animate-spin")} />
            Sync
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowTokenViewer(true)}
            disabled={isPending}
          >
            <Key />
            Token
          </Button>
        </div>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" disabled={isPending}>
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleForceUpload}>
              <Upload />
              Force Upload
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleForcePull}>
              <Download />
              Force Pull
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {remoteMetadata && remoteMetadata.version > syncConfig.version && (
        <div className="text-sm text-muted-foreground">
          Remote has been updated since last sync on this device. <br />
          Remote updated by other device at{" "}
          {format(remoteMetadata.updatedAt, "yyyy-MM-dd HH:mm:ss")} from{" "}
          {remoteMetadata.userAgent?.browser ?? "Unknown browser"} on{" "}
          {remoteMetadata.userAgent?.os ?? "Unknown OS"}
          <br />
        </div>
      )}
      <ConfirmPullDialog
        open={confirmPull.isOpen}
        data={confirmPull.data}
        onResolve={confirmPull.resolve}
      />
      <ConfirmConflictDialog
        open={confirmConflict.isOpen}
        data={confirmConflict.data}
        onResolve={confirmConflict.resolve}
      />
      <ConfirmDeleteDialog
        open={confirmDelete.isOpen}
        onResolve={confirmDelete.resolve}
      />
      <TokenViewerDialog
        open={showTokenViewer}
        onOpenChange={setShowTokenViewer}
        token={syncToken}
        onDelete={handleDeleteToken}
      />
    </div>
  );
}
