"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SignInFormProps {
  onSignIn: (userId: string, passphrase: string) => void;
  onCancel: () => void;
}

export function SignInForm({ onSignIn, onCancel }: SignInFormProps) {
  const [userId, setUserId] = useState("");
  const [passphrase, setPassphrase] = useState("");

  const canSubmit = userId.trim().length > 0 && passphrase.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSignIn(userId.trim(), passphrase);
  };

  const handleCancel = () => {
    setUserId("");
    setPassphrase("");
    onCancel();
  };

  return (
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
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Enter your passphrase"
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) {
              handleSubmit();
            }
          }}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
          Sign In
        </Button>
      </div>
    </div>
  );
}
