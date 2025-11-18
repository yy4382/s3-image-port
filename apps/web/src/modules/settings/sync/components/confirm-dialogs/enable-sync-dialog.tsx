import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Key, RefreshCwIcon } from "lucide-react";
import { ConfirmDialog } from "./confirm-dialog";

interface EnableSyncDialogProps {
  open: boolean;
  onResolve: (value: boolean) => void;
}

export function EnableSyncDialog({ open, onResolve }: EnableSyncDialogProps) {
  return (
    <ConfirmDialog open={open} onResolve={onResolve}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCwIcon className="h-5 w-5" />
            Enable Profile Sync
          </DialogTitle>
          <DialogDescription>
            Understand how sync works before enabling
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-4">
          {/* How it works */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              End-to-End Encryption
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your profiles and settings are encrypted on your device before
              being sent to the server. The server stores only encrypted data
              and cannot read your information. Only devices with your sync
              token can decrypt and access your data.
            </p>
          </div>

          {/* Token storage */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Key className="h-4 w-4" />
              Token Storage
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your sync token serves as both the authentication credential and
              encryption key. It will be stored in your browser's localStorage
              for automatic syncing across sessions.
            </p>
          </div>

          {/* Security considerations */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Security Considerations
            </h4>
            <div className="text-sm space-y-2">
              <p className="text-muted-foreground leading-relaxed">
                Your token is stored in the browser and could potentially be
                accessed by malicious browser extensions or certain types of
                attacks.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                However, this risk is acceptable because your settings data is
                also stored in the browser. If someone can access your token,
                they could already read your unencrypted settings directly. The
                encryption primarily protects your data while it's on the
                server.
              </p>
            </div>
          </div>

          {/* Best practices */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <p className="font-medium text-blue-900 dark:text-blue-100 text-sm mb-2">
              💡 Best Practice
            </p>
            <p className="text-sm text-blue-900/80 dark:text-blue-100/80 leading-relaxed">
              Generate a unique token specifically for Image Port. Do not reuse
              tokens from other services to limit potential damage if the token
              is compromised.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onResolve(false)}>
            Cancel
          </Button>
          <Button onClick={() => onResolve(true)}>
            I Understand, Enable Sync
          </Button>
        </DialogFooter>
      </DialogContent>
    </ConfirmDialog>
  );
}
