"use client";

import { Button } from "@/components/ui/button";
import {
  CloudUploadIcon,
  CloudDownloadIcon,
  Loader2Icon,
  LogOutIcon,
  CheckCircleIcon,
} from "lucide-react";
import { format } from "date-fns";
import type { SyncConfig } from "../sync-store";

interface SyncActionsProps {
  syncConfig: SyncConfig;
  isUploading: boolean;
  isDeleting: boolean;
  isLoggingOut: boolean;
  onUpload: () => void;
  onPull: () => void;
  onDelete: () => void;
  onLogout: () => void;
}

export function SyncActions({
  syncConfig,
  isUploading,
  isDeleting,
  isLoggingOut,
  onUpload,
  onPull,
  onDelete,
  onLogout,
}: SyncActionsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="size-4 text-green-600" />
            <span className="font-medium">Signed in as</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {syncConfig.userId}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          disabled={isLoggingOut}
        >
          <LogOutIcon />
          Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={onUpload}
          disabled={isUploading}
          variant="outline"
          className="h-auto flex-col gap-2 py-4"
        >
          {isUploading ? (
            <>
              <Loader2Icon className="size-5 animate-spin" />
              <span className="text-xs">Uploading...</span>
            </>
          ) : (
            <>
              <CloudUploadIcon className="size-5" />
              <span className="text-xs">Upload to Cloud</span>
            </>
          )}
        </Button>

        <Button
          onClick={onPull}
          variant="outline"
          className="h-auto flex-col gap-2 py-4"
        >
          <CloudDownloadIcon className="size-5" />
          <span className="text-xs">Pull from Cloud</span>
        </Button>
      </div>

      {(syncConfig.lastUpload || syncConfig.lastPull) && (
        <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          {syncConfig.lastUpload && (
            <div>
              Last upload: {format(new Date(syncConfig.lastUpload), "PPp")}
            </div>
          )}
          {syncConfig.lastPull && (
            <div>Last pull: {format(new Date(syncConfig.lastPull), "PPp")}</div>
          )}
        </div>
      )}

      <Button
        onClick={onDelete}
        disabled={isDeleting}
        variant="ghost"
        size="sm"
        className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        {isDeleting ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Deleting...
          </>
        ) : (
          "Delete All Cloud Data"
        )}
      </Button>
    </div>
  );
}
