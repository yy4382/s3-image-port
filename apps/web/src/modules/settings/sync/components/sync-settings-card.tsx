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
import { Separator } from "@/components/ui/separator";
import { getTokenPreview, isValidSyncToken } from "@/lib/encryption/sync-token";
import { useAtom, useSetAtom } from "jotai";
import {
  AlertCircle,
  CheckCircle2,
  Key,
  Loader2,
  Trash2,
  Upload,
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
import { fetchMetadata } from "../sync-api-client";
import { format } from "date-fns";
import { ConfirmPullDialog } from "./confirm-pull-dialog";

const remoteMetadataQuery = (token: string) =>
  queryOptions({
    queryKey: ["remote-metadata"],
    queryFn: () => fetchMetadata(token),
  });

function useConfirmation<TData, TResult>() {
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
  const { data: remoteMetadata } = useQuery(remoteMetadataQuery(syncToken));
  const queryClient = useQueryClient();

  const hasValidToken = isValidSyncToken(syncToken);

  const sync = useSetAtom(syncServiceAtom);

  const confirmPull = useConfirmation<
    Parameters<UserConfirmations["confirmPull"]>[0],
    boolean
  >();

  const { mutate: syncMutation, isPending } = useMutation({
    mutationKey: ["sync"],
    mutationFn: () =>
      sync({
        conflictResolver: () => {
          console.log("conflict resolver: local");
          return Promise.resolve("local");
        },
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profile Sync</CardTitle>
          <CardDescription>
            Sync your profiles across devices using encrypted cloud storage
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

                  <Button
                    onClick={() => syncMutation()}
                    disabled={isPending}
                    className="w-full"
                    variant="default"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Sync
                      </>
                    )}
                  </Button>
                  {remoteMetadata &&
                    remoteMetadata.version > syncConfig.version && (
                      <div className="text-sm text-muted-foreground">
                        Remote has been updated since last sync on this device.{" "}
                        <br />
                        Remote updated at{" "}
                        {format(
                          remoteMetadata.updatedAt,
                          "yyyy-MM-dd HH:mm:ss",
                        )}{" "}
                        from{" "}
                        {remoteMetadata.userAgent?.browser ?? "Unknown browser"}{" "}
                        on {remoteMetadata.userAgent?.os ?? "Unknown OS"}
                        <br />
                      </div>
                    )}
                </>
              )}
            </>
          </CardContent>
        )}
      </Card>

      <ConfirmPullDialog
        open={confirmPull.isOpen}
        data={confirmPull.data}
        onResolve={confirmPull.resolve}
      />
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
