"use client";

import { useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SyncPullDialog } from "./pull-dialog";
import { SignInForm } from "./sign-in-form";
import { SignUpForm } from "./sign-up-form";
import { SyncActions } from "./sync-actions";
import {
  syncConfigAtom,
  syncPassphraseAtom,
  syncStatusAtom,
  syncErrorAtom,
} from "../sync-store";
import { profilesAtom } from "../../settings-store";
import { uploadProfiles, deleteRemoteProfiles } from "../sync-service";
import { toast } from "sonner";

export function SyncSettingsCard() {
  const [syncConfig, setSyncConfig] = useAtom(syncConfigAtom);
  const [passphrase, setPassphrase] = useAtom(syncPassphraseAtom);
  const profiles = useAtomValue(profilesAtom);
  const setProfiles = useSetAtom(profilesAtom);
  const setSyncStatus = useSetAtom(syncStatusAtom);
  const setSyncError = useSetAtom(syncErrorAtom);

  // UI state
  const [mode, setMode] = useState<"idle" | "signin" | "signup">("idle");
  const [pullDialogOpen, setPullDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoggedIn = syncConfig.enabled && syncConfig.userId && passphrase;

  const handleSignup = (userId: string, newPassphrase: string) => {
    setPassphrase(newPassphrase);
    setSyncConfig({
      enabled: true,
      userId,
      version: 0,
    });
    setMode("idle");
    toast.success("Sync account created successfully!");
  };

  const handleSignin = (userId: string, newPassphrase: string) => {
    setPassphrase(newPassphrase);
    setSyncConfig({
      enabled: true,
      userId,
      version: 0,
    });
    setMode("idle");
    toast.success("Signed in successfully!");
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    setSyncConfig({
      enabled: false,
      version: 0,
    });
    setPassphrase("");
    setSyncError(null);
    setIsLoggingOut(false);
    toast.success("Logged out from sync");
  };

  const handleUpload = async () => {
    if (!isLoggedIn || !syncConfig.userId) {
      toast.error("Please sign in first");
      return;
    }

    setIsUploading(true);
    setSyncStatus("uploading");
    setSyncError(null);

    try {
      const result = await uploadProfiles(
        profiles,
        passphrase,
        syncConfig.userId,
        syncConfig.version,
      );

      if (result.conflict) {
        toast.error(
          "Version conflict detected. Pull the latest version first, then upload again.",
        );
        setSyncError("Version conflict");
      } else {
        setSyncConfig((prev) => ({
          ...prev,
          version: result.version,
          lastUpload: Date.now(),
        }));
        toast.success("Profiles uploaded successfully");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      const message =
        error instanceof Error ? error.message : "Failed to upload profiles";
      setSyncError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
      setSyncStatus("idle");
    }
  };

  const handlePullClick = () => {
    if (!isLoggedIn) {
      toast.error("Please sign in first");
      return;
    }

    setPullDialogOpen(true);
  };

  const handlePullApply = (remote: {
    profiles: typeof profiles;
    version: number;
  }) => {
    setProfiles(remote.profiles);

    setSyncConfig((prev) => ({
      ...prev,
      version: remote.version,
      lastPull: Date.now(),
    }));

    toast.success("Remote profiles applied successfully");
  };

  const handleDelete = async () => {
    if (!syncConfig.userId) {
      toast.error("Please sign in first");
      return;
    }

    const confirmed = confirm(
      "Are you sure you want to delete all your cloud data? This cannot be undone.",
    );
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      await deleteRemoteProfiles(passphrase, syncConfig.userId);
      setSyncConfig((prev) => ({
        ...prev,
        version: 0,
        lastUpload: undefined,
        lastPull: undefined,
      }));
      toast.success("Remote profiles deleted successfully");
    } catch (error) {
      console.error("Delete failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete remote profiles";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Cloud Sync</CardTitle>
          <CardDescription>
            Backup and sync your profiles across devices with end-to-end
            encryption
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!isLoggedIn && mode === "idle" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Backup your profiles and access them from any device
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setMode("signin")}
                    variant="outline"
                    className="flex-1"
                  >
                    Sign In
                  </Button>
                  <Button onClick={() => setMode("signup")} className="flex-1">
                    Create Account
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!isLoggedIn && mode === "signin" && (
            <SignInForm
              onSignIn={handleSignin}
              onCancel={() => setMode("idle")}
            />
          )}

          {!isLoggedIn && mode === "signup" && (
            <SignUpForm
              onSignUp={handleSignup}
              onCancel={() => setMode("idle")}
            />
          )}

          {isLoggedIn && (
            <SyncActions
              syncConfig={syncConfig}
              isUploading={isUploading}
              isDeleting={isDeleting}
              isLoggingOut={isLoggingOut}
              onUpload={handleUpload}
              onPull={handlePullClick}
              onDelete={handleDelete}
              onLogout={handleLogout}
            />
          )}
        </CardContent>
      </Card>

      <SyncPullDialog
        open={pullDialogOpen}
        onOpenChange={setPullDialogOpen}
        onApply={handlePullApply}
        passphrase={passphrase}
        userId={syncConfig.userId || ""}
      />
    </>
  );
}
