"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validatePassphrase } from "@/lib/encryption/crypto";
import { AlertCircleIcon, CheckCircleIcon } from "lucide-react";

interface PassphraseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (passphrase: string) => void;
  mode: "setup" | "enter";
  title?: string;
  description?: string;
}

export function PassphraseDialog({
  open,
  onOpenChange,
  onConfirm,
  mode,
  title,
  description,
}: PassphraseDialogProps) {
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validation = validatePassphrase(passphrase);
  const showValidation = passphrase.length > 0;
  const isConfirmMode = mode === "setup";
  const passphraseMatch = !isConfirmMode || passphrase === confirmPassphrase;
  const canSubmit =
    validation.valid && passphraseMatch && passphrase.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    if (isConfirmMode && passphrase !== confirmPassphrase) {
      setError("Passphrases do not match");
      return;
    }

    setError(null);
    onConfirm(passphrase);
    setPassphrase("");
    setConfirmPassphrase("");
  };

  const handleCancel = () => {
    setPassphrase("");
    setConfirmPassphrase("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title ||
              (mode === "setup"
                ? "Set Up Sync Passphrase"
                : "Enter Passphrase")}
          </DialogTitle>
          <DialogDescription>
            {description ||
              (mode === "setup"
                ? "Create a strong passphrase to encrypt your profiles. This passphrase cannot be recovered if lost."
                : "Enter your passphrase to decrypt and sync your profiles.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="passphrase">
              {mode === "setup" ? "Passphrase" : "Enter Passphrase"}
            </Label>
            <Input
              id="passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) {
                  handleSubmit();
                }
              }}
              placeholder="Enter a strong passphrase"
              autoComplete="new-password"
            />
            {showValidation && (
              <div className="flex items-start gap-2 text-sm">
                {validation.valid ? (
                  <>
                    <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-green-600" />
                    <span className="text-green-600">Strong passphrase</span>
                  </>
                ) : (
                  <>
                    <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <span className="text-amber-600">{validation.message}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {isConfirmMode && (
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Passphrase</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit) {
                    handleSubmit();
                  }
                }}
                placeholder="Confirm your passphrase"
                autoComplete="new-password"
              />
              {confirmPassphrase.length > 0 && !passphraseMatch && (
                <div className="flex items-start gap-2 text-sm">
                  <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-red-600" />
                  <span className="text-red-600">Passphrases do not match</span>
                </div>
              )}
            </div>
          )}

          {mode === "setup" && (
            <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/20 dark:text-blue-200">
              <strong>Note:</strong> This passphrase encrypts your profiles
              before sending them to the server. It will be saved locally for
              convenience. If you lose it, your server-stored profiles cannot be
              recovered.
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/20 dark:text-red-200">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {mode === "setup" ? "Set Passphrase" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
