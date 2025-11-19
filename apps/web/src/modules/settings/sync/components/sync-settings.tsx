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
import { useTranslations } from "use-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isValidSyncToken } from "@/lib/encryption/sync-token";
import { useAtom } from "jotai";
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
import { syncStateAtom, syncTokenAtom } from "../sync-store";
import { TokenSetupDialog } from "./token-management/token-setup-dialog";
import { TokenViewerDialog } from "./token-management/token-viewer-dialog";
import { focusAtom } from "jotai-optics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UploadProfileError } from "../sync-api-client";
import { forceUpload } from "../actions/force-upload";
import { forcePull } from "../actions/force-pull";
import { deleteRemoteSync } from "../actions/delete";
import { format } from "date-fns";
import { ConfirmDeleteDialog } from "./confirm-dialogs/confirm-delete-dialog";
import { settingsForSyncAtom } from "../../settings-store";
import { AutoResizeHeight } from "@/components/misc/auto-resize-height";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { EnableSyncDialog } from "./confirm-dialogs/enable-sync-dialog";
import {
  remoteMetadataQuery,
  useToastUploadProfileError,
  useSyncMutationStatus,
} from "../use-sync";
import { SyncProvider } from "./global/sync-provider";

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
  const t = useTranslations("settings.sync");

  const hasValidToken = isValidSyncToken(syncToken);

  return (
    <div className="flex flex-col gap-3">
      <CardHeader className="px-0">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
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
  const t = useTranslations("settings.sync");

  const [showTokenDialog, setShowTokenDialog] = useState(false);

  const handleTokenConfirm = (token: string) => {
    setSyncToken(token);
    toast.success(t("toasts.syncEnabled"));
  };

  return (
    <div className="space-y-3">
      <Button onClick={() => setShowTokenDialog(true)} variant="outline">
        <Key />
        {t("setupToken")}
      </Button>
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
  const [syncToken, setSyncToken] = useAtom(syncTokenAtom);
  const t = useTranslations("settings.sync");
  const { data: remoteMetadata } = useQuery(
    remoteMetadataQuery({ token: syncToken, enabled: syncConfig.enabled }),
  );
  const queryClient = useQueryClient();
  const [local, setLocal] = useAtom(settingsForSyncAtom);
  const [showTokenViewer, setShowTokenViewer] = useState(false);

  const confirmDelete = useConfirmation<"", boolean>();
  const isSyncPending = useSyncMutationStatus() === "pending";
  const toastUploadProfileError = useToastUploadProfileError();

  const handleForceUpload = async () => {
    try {
      const result = await forceUpload(local, syncToken);
      if (result.config) {
        setSyncConfig(result.config);
      }
      toast.success(t("toasts.uploadSuccess"));
      queryClient.invalidateQueries({
        queryKey: remoteMetadataQuery.queryKey,
      });
    } catch (error) {
      if (error instanceof UploadProfileError) {
        return toastUploadProfileError(error);
      }
      toast.error(t("toasts.errors.uploadFailed"));
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
      toast.error(t("toasts.errors.pullFailed"));
      console.error("Failed to fetch remote profile", error);
    }
  };

  const handleDeleteToken = () => {
    setSyncToken("");
    setSyncConfig({ enabled: true, version: 0, lastUpload: null });
    toast.info(t("toasts.tokenCleared"));
  };

  const handleDelete = async () => {
    const confirmed = await confirmDelete.confirm("");
    if (confirmed) {
      const result = await deleteRemoteSync(syncToken);
      if (result.success) {
        toast.success(t("toasts.deleteSuccess"));
        try {
          await queryClient.invalidateQueries({
            queryKey: remoteMetadataQuery.queryKey,
          });
        } finally {
          setSyncConfig({ enabled: true, version: 0, lastUpload: null });
        }
      } else if (result.reason === "no-such-user") {
        toast.error(t("toasts.noCorrespondingProfile"));
      } else {
        toast.error(t("toasts.deleteFailed"));
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-between">
        <div className="flex gap-2">
          <SyncProvider
            render={({ syncMutation }) => {
              return (
                <Button
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  variant="default"
                >
                  <RefreshCwIcon
                    className={cn(syncMutation.isPending && "animate-spin")}
                  />
                  {t("syncButton")}
                </Button>
              );
            }}
          />
          <Button
            variant="secondary"
            onClick={() => setShowTokenViewer(true)}
            disabled={isSyncPending}
          >
            <Key />
            {t("tokenButton")}
          </Button>
        </div>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" disabled={isSyncPending}>
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleForceUpload}>
              <Upload />
              {t("forceUpload")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleForcePull}>
              <Download />
              {t("forcePull")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete}>
              <Trash2 />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {remoteMetadata && remoteMetadata.version > syncConfig.version && (
        <div className="text-sm text-muted-foreground">
          {t("remoteUpdatedMessage")} <br />
          {t("remoteUpdatedDetails", {
            time: format(remoteMetadata.updatedAt, "yyyy-MM-dd HH:mm:ss"),
            browser: remoteMetadata.userAgent?.browser ?? "Unknown browser",
            os: remoteMetadata.userAgent?.os ?? "Unknown OS",
          })}
          <br />
        </div>
      )}
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
