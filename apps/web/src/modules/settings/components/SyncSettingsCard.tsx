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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SyncPullDialog } from "./SyncPullDialog";
import {
  syncConfigAtom,
  syncPassphraseAtom,
  syncStatusAtom,
  syncErrorAtom,
} from "../sync-store";
import { profilesAtom } from "../settings-store";
import { uploadProfiles, deleteRemoteProfiles } from "../sync-service";
import { toast } from "sonner";
import {
  CloudUploadIcon,
  CloudDownloadIcon,
  Loader2Icon,
  LogOutIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from "lucide-react";
import { format } from "date-fns";
import { validatePassphrase } from "@/lib/encryption/crypto";

export function SyncSettingsCard() {
  const [syncConfig, setSyncConfig] = useAtom(syncConfigAtom);
  const [passphrase, setPassphrase] = useAtom(syncPassphraseAtom);
  const profiles = useAtomValue(profilesAtom);
  const setProfiles = useSetAtom(profilesAtom);
  const setSyncStatus = useSetAtom(syncStatusAtom);
  const setSyncError = useSetAtom(syncErrorAtom);

  // UI state
  const [mode, setMode] = useState<"idle" | "signin" | "signup">("idle");
  const [userId, setUserId] = useState("");
  const [passphraseInput, setPassphraseInput] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [pullDialogOpen, setPullDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoggedIn = syncConfig.enabled && syncConfig.userId && passphrase;
  const passphraseValidation = validatePassphrase(passphraseInput);
  const canSignup =
    userId.trim().length > 0 &&
    passphraseValidation.valid &&
    passphraseInput === confirmPassphrase;
  const canSignin = userId.trim().length > 0 && passphraseInput.length > 0;

  const handleSignup = () => {
    if (!canSignup) return;

    setPassphrase(passphraseInput);
    setSyncConfig({
      enabled: true,
      userId: userId.trim(),
      version: 0,
    });
    setMode("idle");
    setUserId("");
    setPassphraseInput("");
    setConfirmPassphrase("");
    toast.success("Sync account created successfully!");
  };

  const handleSignin = () => {
    if (!canSignin) return;

    setPassphrase(passphraseInput);
    setSyncConfig({
      enabled: true,
      userId: userId.trim(),
      version: 0,
    });
    setMode("idle");
    setUserId("");
    setPassphraseInput("");
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
        syncConfig.userId!,
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

  const handlePullApply = (remoteProfiles: typeof profiles) => {
    // Apply remote profiles using Jotai atom setter
    // This will automatically sync to localStorage via atomWithStorageMigration
    setProfiles(remoteProfiles);

    setSyncConfig((prev) => ({
      ...prev,
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
      await deleteRemoteProfiles(syncConfig.userId);
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
            // Not logged in - show login/signup options
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
            // Sign in mode
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-userId">User ID</Label>
                <Input
                  id="signin-userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter your user ID"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-passphrase">Passphrase</Label>
                <Input
                  id="signin-passphrase"
                  type="password"
                  value={passphraseInput}
                  onChange={(e) => setPassphraseInput(e.target.value)}
                  placeholder="Enter your passphrase"
                  autoComplete="current-password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSignin) {
                      handleSignin();
                    }
                  }}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode("idle");
                    setUserId("");
                    setPassphraseInput("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSignin}
                  disabled={!canSignin}
                  className="flex-1"
                >
                  Sign In
                </Button>
              </div>
            </div>
          )}

          {!isLoggedIn && mode === "signup" && (
            // Sign up mode - like registration
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setup-userId">User ID</Label>
                <Input
                  id="setup-userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Choose a unique user ID"
                  autoComplete="username"
                />
                <p className="text-xs text-muted-foreground">
                  This will be your identifier (like a username)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-passphrase">Passphrase</Label>
                <Input
                  id="setup-passphrase"
                  type="password"
                  value={passphraseInput}
                  onChange={(e) => setPassphraseInput(e.target.value)}
                  placeholder="Create a strong passphrase"
                  autoComplete="new-password"
                />
                {passphraseInput.length > 0 && (
                  <div className="flex items-start gap-2 text-xs">
                    {passphraseValidation.valid ? (
                      <>
                        <CheckCircleIcon className="mt-0.5 size-3 shrink-0 text-green-600" />
                        <span className="text-green-600">
                          Strong passphrase
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircleIcon className="mt-0.5 size-3 shrink-0 text-amber-600" />
                        <span className="text-amber-600">
                          {passphraseValidation.message}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="setup-confirm">Confirm Passphrase</Label>
                <Input
                  id="setup-confirm"
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Re-enter your passphrase"
                  autoComplete="new-password"
                />
                {confirmPassphrase.length > 0 &&
                  passphraseInput !== confirmPassphrase && (
                    <p className="flex items-center gap-2 text-xs text-red-600">
                      <AlertCircleIcon className="size-3 shrink-0" />
                      Passphrases do not match
                    </p>
                  )}
              </div>

              <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/20 dark:text-blue-200">
                Your passphrase encrypts your profiles before sending them to
                the server. It will be saved locally for convenience.
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode("idle");
                    setUserId("");
                    setPassphraseInput("");
                    setConfirmPassphrase("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSignup}
                  disabled={!canSignup}
                  className="flex-1"
                >
                  Create Account
                </Button>
              </div>
            </div>
          )}

          {isLoggedIn && (
            // Logged in - show sync actions
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
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOutIcon />
                  Sign Out
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleUpload}
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
                  onClick={handlePullClick}
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
                      Last upload:{" "}
                      {format(new Date(syncConfig.lastUpload), "PPp")}
                    </div>
                  )}
                  {syncConfig.lastPull && (
                    <div>
                      Last pull: {format(new Date(syncConfig.lastPull), "PPp")}
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleDelete}
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
