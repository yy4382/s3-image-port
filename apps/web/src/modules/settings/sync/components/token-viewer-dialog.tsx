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
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { getTokenPreview } from "@/lib/encryption/sync-token";

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
  const [showFullToken, setShowFullToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete your sync token? You'll need it to sync again on this device.",
      )
    ) {
      onDelete();
      onOpenChange(false);
    }
  };

  const displayToken = showFullToken ? token : getTokenPreview(token);

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
          <div className="p-4 rounded-lg border bg-muted/50">
            <p className="font-mono text-sm break-all">{displayToken}</p>
          </div>

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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFullToken(!showFullToken)}
            className="flex-1"
          >
            {showFullToken ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Hide Token
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Show Full Token
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleCopy} className="flex-1">
            {copied ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Token
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="flex-1"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Token
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
