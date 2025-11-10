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
import { useState } from "react";
import { toast } from "sonner";
import { syncServiceAtom } from "../sync-service";
import { syncConfigAtom, syncStatusAtom, syncTokenAtom } from "../sync-store";
import { TokenSetupDialog } from "./token-setup-dialog";
import { focusAtom } from "jotai-optics";

export function SyncSettingsCard() {
  const [syncConfig] = useAtom(syncConfigAtom);
  const [syncToken] = useAtom(syncTokenAtom);
  const [syncStatus, setSyncStatus] = useAtom(syncStatusAtom);

  const hasValidToken = isValidSyncToken(syncToken);

  const sync = useSetAtom(syncServiceAtom);

  const handleSync = async () => {
    setSyncStatus("pulling");
    try {
      await sync(() => {
        console.log("conflict resolver: local");
        return Promise.resolve("local");
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSyncStatus("idle");
    }
  };

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
                    onClick={handleSync}
                    disabled={syncStatus !== "idle"}
                    className="w-full"
                    variant="default"
                  >
                    {syncStatus === "uploading" ? (
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
                </>
              )}
            </>
          </CardContent>
        )}
      </Card>
    </>
  );
}

const isEnabledAtom = focusAtom(syncConfigAtom, (optic) =>
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
  const [syncConfig, setSyncConfig] = useAtom(syncConfigAtom);

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
