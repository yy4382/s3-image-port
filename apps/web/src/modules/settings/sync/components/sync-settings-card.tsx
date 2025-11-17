"use client";

import { Switch } from "@/components/animate-ui/radix/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import { Separator } from "@/components/ui/separator";
import { getTokenPreview, isValidSyncToken } from "@/lib/encryption/sync-token";
import { useAtom, useSetAtom } from "jotai";
import {
  AlertCircle,
  CheckCircle2,
  Key,
  Loader2,
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
} from "../sync-service";
import { syncStateAtom, syncTokenAtom } from "../sync-store";
import { TokenSetupDialog } from "./token-setup-dialog";
import { focusAtom } from "jotai-optics";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  deleteRemoteProfiles,
  fetchMetadata,
  fetchRemoteProfiles,
  uploadProfiles,
} from "../sync-api-client";
import { format } from "date-fns";
import { ConfirmPullDialog } from "./confirm-pull-dialog";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { ConfirmConflictDialog } from "./confirm-conflict-dialog";
import { assertUnreachable } from "@/lib/utils/assert-unreachable";
import { settingsForSyncAtom } from "../../settings-store";
import deepEqual from "deep-equal";

const remoteMetadataQuery = (token: string) =>
  queryOptions({
    queryKey: ["remote-metadata"],
    queryFn: () => fetchMetadata(token),
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

export function SyncSettingsCard() {
  const [syncConfig] = useAtom(syncStateAtom);
  const [syncToken] = useAtom(syncTokenAtom);

  const hasValidToken = isValidSyncToken(syncToken);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profile Sync</CardTitle>
          <CardDescription>
            Sync your profiles across devices using end to end encrypted cloud
            storage
          </CardDescription>
          <CardAction>
            <SyncSwitch />
          </CardAction>
        </CardHeader>

        {syncConfig.enabled && (
          <CardContent className="space-y-6">
            <>
              <SyncTokenStatus />

              {/* Sync Actions */}
              {hasValidToken && (
                <>
                  <Separator />
                  <SyncActions />
                </>
              )}
            </>
          </CardContent>
        )}
      </Card>
    </>
  );
}

const isEnabledAtom = focusAtom(syncStateAtom, (optic) =>
  optic.prop("enabled"),
);

function SyncSwitch() {
  const [isEnabled, setIsEnabled] = useAtom(isEnabledAtom);
  return (
    <div className="flex items-center gap-2 py-2">
      <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
    </div>
  );
}

function SyncTokenStatus() {
  const [syncToken, setSyncToken] = useAtom(syncTokenAtom);
  const [syncConfig, setSyncConfig] = useAtom(syncStateAtom);

  const [showTokenDialog, setShowTokenDialog] = useState(false);

  const hasValidToken = isValidSyncToken(syncToken);
  const tokenPreview = hasValidToken ? getTokenPreview(syncToken) : "";

  const handleClearToken = () => {
    if (
      confirm(
        "Are you sure you want to clear your sync token? You'll need it to sync again.",
      )
    ) {
      setSyncToken("");
      setSyncConfig({ enabled: true, version: 0, lastUpload: null });
      toast.info("Sync token cleared");
    }
  };
  const handleTokenConfirm = (token: string) => {
    setSyncToken(token);
    setSyncConfig({ ...syncConfig, enabled: true });
    toast.success("Sync enabled successfully");
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Sync Token</span>
        </div>
        {hasValidToken ? (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Missing
          </Badge>
        )}
      </div>

      {hasValidToken && (
        <div className="flex items-center gap-2">
          <div className="flex-1 p-2 rounded border bg-muted/50 font-mono text-sm">
            {tokenPreview}
          </div>
          <Button variant="outline" size="sm" onClick={handleClearToken}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!hasValidToken && (
        <Button
          onClick={() => setShowTokenDialog(true)}
          variant="outline"
          className="w-full"
        >
          Setup Token
        </Button>
      )}
      <TokenSetupDialog
        open={showTokenDialog}
        onOpenChange={setShowTokenDialog}
        onTokenConfirm={handleTokenConfirm}
      />
    </div>
  );
}

function SyncActions() {
  const [syncConfig, setSyncConfig] = useAtom(syncStateAtom);
  const [syncToken] = useAtom(syncTokenAtom);
  const { data: remoteMetadata } = useQuery(remoteMetadataQuery(syncToken));
  const queryClient = useQueryClient();
  const [local, setLocal] = useAtom(settingsForSyncAtom);

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
    onSettled: (data) => {
      if (
        !data ||
        data === SyncActionType.DO_NOTHING ||
        data === SyncActionType.NOT_CHANGED
      )
        return;
      queryClient.invalidateQueries(remoteMetadataQuery(syncToken));
    },
  });
  const handleForceUpload = async () => {
    try {
      const remote = await fetchRemoteProfiles(syncToken);
      if (remote && deepEqual(local, remote.data)) {
        toast.info("Remote profile is already same as local profile");
        setSyncConfig((prev) => ({
          ...prev,
          version: remote.version,
          lastUpload: remote.data,
        }));
        return;
      }
      const result = await uploadProfiles(local, syncToken, "force");
      if (!result.success) {
        toast.error("Failed to upload local profile");
        console.error("Failed to upload local profile", result);
        return;
      }
      setSyncConfig((prev) => ({
        ...prev,
        version: result.version,
        lastUpload: result.current.data,
      }));
      toast.success("Local profile uploaded successfully");
      queryClient.invalidateQueries(remoteMetadataQuery(syncToken));
    } catch (error) {
      toast.error("Failed to upload local profile");
      console.error("Failed to upload local profile", error);
      return;
    }
  };

  const handleForcePull = async () => {
    try {
      const result = await fetchRemoteProfiles(syncToken);
      if (!result) {
        toast.error("No corresponding profile found on the server");
        return;
      }
      setLocal(result.data);
      setSyncConfig((prev) => ({
        ...prev,
        version: result.version,
        lastUpload: result.data,
      }));
    } catch (error) {
      toast.error("Failed to fetch remote profile");
      console.error("Failed to fetch remote profile", error);
      return;
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmDelete.confirm("");
    if (confirmed) {
      const result = await deleteRemoteProfiles(syncToken);
      switch (result._tag) {
        case "success": {
          toast.success("Remote sync data deleted");
          try {
            await queryClient.invalidateQueries(remoteMetadataQuery(syncToken));
          } finally {
            setSyncConfig({ enabled: true, version: 0, lastUpload: null });
          }
          break;
        }
        case "no-such-user": {
          toast.error("No corresponding profile found on the server");
          break;
        }
        case "error": {
          toast.error("Failed to delete remote sync data");
          break;
        }
        /* v8 ignore next */
        default: {
          assertUnreachable(result);
        }
      }
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <Button
          onClick={() => syncMutation()}
          disabled={isPending}
          className="flex-1"
          variant="default"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              Sync
            </>
          )}
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" disabled={isPending}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleForceUpload}>
              <Upload className="mr-2 h-4 w-4" />
              Force Upload
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleForcePull}>
              <Download className="mr-2 h-4 w-4" />
              Force Pull
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {remoteMetadata && remoteMetadata.version > syncConfig.version && (
        <div className="text-sm text-muted-foreground">
          Remote has been updated since last sync on this device. <br />
          Remote updated at{" "}
          {format(remoteMetadata.updatedAt, "yyyy-MM-dd HH:mm:ss")} from{" "}
          {remoteMetadata.userAgent?.browser ?? "Unknown browser"} on{" "}
          {remoteMetadata.userAgent?.os ?? "Unknown OS"}
          <br />
        </div>
      )}
      <ConfirmPullDialog
        open={confirmPull.isOpen}
        data={typeof confirmPull.data === "symbol" ? null : confirmPull.data}
        onResolve={confirmPull.resolve}
      />
      <ConfirmConflictDialog
        open={confirmConflict.isOpen}
        data={
          typeof confirmConflict.data === "symbol" ? null : confirmConflict.data
        }
        onResolve={confirmConflict.resolve}
      />
      <ConfirmDeleteDialog
        open={confirmDelete.isOpen}
        onResolve={confirmDelete.resolve}
      />
    </div>
  );
}
