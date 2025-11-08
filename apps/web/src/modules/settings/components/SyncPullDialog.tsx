"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProfileDiff } from "./ProfileDiff";
import {
  fetchRemoteProfiles,
  compareProfiles,
  ProfilesDiff,
} from "../sync-service";
import { profilesSchema } from "../settings-store";
import { useAtomValue } from "jotai";
import { profilesAtom } from "../settings-store";
import { Loader2Icon, AlertTriangleIcon } from "lucide-react";
import { z } from "zod";

type Profiles = z.infer<typeof profilesSchema>;

interface SyncPullDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (remoteProfiles: Profiles) => void;
  passphrase: string;
  userId: string;
}

type LoadingState = "idle" | "loading" | "error" | "loaded" | "no-remote";

export function SyncPullDialog({
  open,
  onOpenChange,
  onApply,
  passphrase,
  userId,
}: SyncPullDialogProps) {
  const localProfiles = useAtomValue(profilesAtom);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [diff, setDiff] = useState<ProfilesDiff | null>(null);
  const [remoteProfiles, setRemoteProfiles] = useState<Profiles | null>(null);

  const loadRemoteProfiles = useCallback(async () => {
    startTransition(() => {
      setLoadingState("loading");
      setError(null);
    });

    try {
      const result = await fetchRemoteProfiles(passphrase, userId);

      if (!result) {
        startTransition(() => {
          setLoadingState("no-remote");
        });
        return;
      }

      startTransition(() => {
        setRemoteProfiles(result.profiles);
        const profilesDiff = compareProfiles(localProfiles, result.profiles);
        setDiff(profilesDiff);
        setLoadingState("loaded");
      });
    } catch (err) {
      console.error("Failed to fetch remote profiles:", err);
      startTransition(() => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch remote profiles. Check your passphrase and connection.",
        );
        setLoadingState("error");
      });
    }
  }, [passphrase, userId, localProfiles]);

  useEffect(() => {
    if (open && passphrase && userId) {
      void loadRemoteProfiles();
    }
  }, [open, passphrase, userId, loadRemoteProfiles]);

  const handleApply = () => {
    if (remoteProfiles) {
      onApply(remoteProfiles);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setLoadingState("idle");
    setError(null);
    setDiff(null);
    setRemoteProfiles(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pull Profiles from Server</DialogTitle>
          <DialogDescription>
            Review the changes before applying remote profiles to your local
            storage.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loadingState === "loading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Fetching and decrypting remote profiles...
              </p>
            </div>
          )}

          {loadingState === "no-remote" && (
            <div className="flex flex-col items-center gap-3 rounded-md border border-blue-200 bg-blue-50 p-6 text-blue-800 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-200">
              <AlertTriangleIcon className="size-8" />
              <div className="text-center">
                <p className="font-medium">No Remote Profiles Found</p>
                <p className="text-sm mt-1">
                  There are no profiles stored on the server yet. Upload your
                  local profiles to get started.
                </p>
              </div>
            </div>
          )}

          {loadingState === "error" && error && (
            <div className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-200">
              <div className="flex items-start gap-2">
                <AlertTriangleIcon className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-medium">Error Loading Remote Profiles</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadRemoteProfiles}
                className="self-start"
              >
                Retry
              </Button>
            </div>
          )}

          {loadingState === "loaded" && diff && <ProfileDiff diff={diff} />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          {loadingState === "loaded" && diff && (
            <Button onClick={handleApply} disabled={!diff.hasChanges}>
              {diff.hasChanges ? "Apply Changes" : "No Changes to Apply"}
            </Button>
          )}
          {loadingState === "no-remote" && (
            <Button onClick={handleCancel}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
