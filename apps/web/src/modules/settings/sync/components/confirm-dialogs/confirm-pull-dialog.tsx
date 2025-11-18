import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Download } from "lucide-react";
import { type UserConfirmations } from "../../actions/sync";
import { format } from "date-fns";
import { SettingsViewer } from "../settings-viewer";
import { ConfirmDialog } from "./confirm-dialog";

export function ConfirmPullDialog({
  open,
  data,
  onResolve,
}: {
  open: boolean;
  data: Parameters<UserConfirmations["confirmPull"]>[0] | null;
  onResolve: (value: boolean) => void;
}) {
  if (!data) return null;

  return (
    <ConfirmDialog open={open} onResolve={onResolve}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Pull Remote Profiles
          </DialogTitle>
          <DialogDescription>
            The current profiles on the remote server is newer than the local
            ones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm">
            The current settings on the remote server were uploaded at{" "}
            <code className="font-mono font-semibold">
              {format(data.remote.updatedAt, "yyyy-MM-dd HH:mm:ss")}
            </code>{" "}
            from{" "}
            <code className="font-mono font-semibold">
              {data.remote.userAgent?.browser ?? "Unknown browser"}
            </code>{" "}
            on{" "}
            <code className="font-mono font-semibold">
              {data.remote.userAgent?.os ?? "Unknown OS"}
            </code>
            .
          </p>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">
              Settings Comparison (Local vs Remote):
            </h4>
            <div className="max-h-[400px] overflow-y-auto">
              <SettingsViewer
                localData={data.local.data}
                remoteData={data.remote.data.data}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onResolve(false)}>
            Cancel
          </Button>
          <Button onClick={() => onResolve(true)}>
            <Download />
            Accept changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </ConfirmDialog>
  );
}
