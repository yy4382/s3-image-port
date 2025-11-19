import { useAtomValue } from "jotai";
import { syncStateAtom, syncTokenAtom } from "../../sync-store";
import { SyncProvider, SyncProviderProps } from "./sync-provider";
import { useQuery } from "@tanstack/react-query";
import { remoteMetadataQuery } from "../../use-sync";
import { useEffect, useRef, useState } from "react";
import { toast, useSonner } from "sonner";
import { Button } from "@/components/ui/button";

const DetectRemoteChange: SyncProviderProps["render"] = ({ syncMutation }) => {
  const syncToken = useAtomValue(syncTokenAtom);
  const syncConfig = useAtomValue(syncStateAtom);
  const { data: remoteMetadata } = useQuery(
    remoteMetadataQuery({ token: syncToken, enabled: syncConfig.enabled }),
  );
  const isRemoteChange =
    remoteMetadata && remoteMetadata.version > syncConfig.version;
  const [dismissedRemoteVersion, setDismissedRemoteVersion] = useState<
    number | null
  >(null);
  const toastId = useRef<string | number | null>(null);
  const { toasts } = useSonner();

  useEffect(() => {
    // should not show toast (remote not changed or already dismissed)
    if (!isRemoteChange || remoteMetadata?.version === dismissedRemoteVersion) {
      if (toastId.current === null) {
        return;
      } else {
        const toastT = toasts.find((toast) => toast.id === toastId.current);
        if (toastT) toast.dismiss(toastT.id);
        return;
      }
    }
    // show toast
    const toastT = toasts.find((toast) => toast.id === toastId.current);
    if (toastT) {
      // update dismiss and auto close handlers, since the current toast may
      // have been created before remote metadata changed again, causing stale closures
      toastT.onDismiss = () => {
        setDismissedRemoteVersion(remoteMetadata?.version ?? null);
      };
      toastT.onAutoClose = () => {
        setDismissedRemoteVersion(remoteMetadata?.version ?? null);
      };
      return;
    } else {
      toastId.current = toast.info(
        "Remote has been updated since last sync on this device.",
        {
          action: (
            <Button
              onClick={() => {
                syncMutation.mutate();
              }}
              size="sm"
              disabled={syncMutation.isPending}
            >
              Sync
            </Button>
          ),
          dismissible: true,
          onDismiss: () => {
            setDismissedRemoteVersion(remoteMetadata?.version ?? null);
          },
          onAutoClose: () => {
            setDismissedRemoteVersion(remoteMetadata?.version ?? null);
          },
          duration: Infinity,
        },
      );
    }
  }, [
    dismissedRemoteVersion,
    isRemoteChange,
    remoteMetadata?.version,
    syncMutation,
    toasts,
  ]);
  return <></>;
};

export function RemoteChangeDetector() {
  return <SyncProvider render={DetectRemoteChange} />;
}
