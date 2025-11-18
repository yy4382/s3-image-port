"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Trash2 } from "lucide-react";
import { TokenDisplay } from "./token-display";

interface TokenViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  onDelete: () => void;
}

export function TokenViewerDialog({
  open,
  onOpenChange,
  token,
  onDelete,
}: TokenViewerDialogProps) {
  const handleClear = () => {
    if (
      confirm(
        "Are you sure you want to clear your sync token? You'll need it to sync again on this device.",
      )
    ) {
      onDelete();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sync Token</DialogTitle>
          <DialogDescription>
            Your sync token is used to encrypt and decrypt your profiles. Keep
            it safe and secure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <TokenDisplay token={token} />

          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium mb-1">Keep your token secure!</p>
              <p className="text-yellow-700 dark:text-yellow-300">
                Anyone with this token can decrypt your synced profiles. Store
                it safely in a password manager.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={handleClear}>
            <Trash2 />
            Clear Token
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
