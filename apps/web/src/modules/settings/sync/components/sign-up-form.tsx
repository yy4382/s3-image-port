"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validatePassphrase } from "@/lib/encryption/crypto";
import { AlertCircleIcon, CheckCircleIcon } from "lucide-react";

interface SignUpFormProps {
  onSignUp: (userId: string, passphrase: string) => void;
  onCancel: () => void;
}

export function SignUpForm({ onSignUp, onCancel }: SignUpFormProps) {
  const [userId, setUserId] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");

  const passphraseValidation = validatePassphrase(passphrase);
  const canSubmit =
    userId.trim().length > 0 &&
    passphraseValidation.valid &&
    passphrase === confirmPassphrase;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSignUp(userId.trim(), passphrase);
  };

  const handleCancel = () => {
    setUserId("");
    setPassphrase("");
    setConfirmPassphrase("");
    onCancel();
  };

  return (
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
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Create a strong passphrase"
          autoComplete="new-password"
        />
        {passphrase.length > 0 && (
          <div className="flex items-start gap-2 text-xs">
            {passphraseValidation.valid ? (
              <>
                <CheckCircleIcon className="mt-0.5 size-3 shrink-0 text-green-600" />
                <span className="text-green-600">Strong passphrase</span>
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
        {confirmPassphrase.length > 0 && passphrase !== confirmPassphrase && (
          <p className="flex items-center gap-2 text-xs text-red-600">
            <AlertCircleIcon className="size-3 shrink-0" />
            Passphrases do not match
          </p>
        )}
      </div>

      <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/20 dark:text-blue-200">
        Your passphrase encrypts your profiles before sending them to the
        server. It will be saved locally for convenience.
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
          Create Account
        </Button>
      </div>
    </div>
  );
}
