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
import { type UserConfirmations } from "../sync-service";
import { format } from "date-fns";
import { SettingsViewer } from "./settings-viewer";
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
            Pull Remote Settings
          </DialogTitle>
          <DialogDescription>
            Remote settings are available. Review the changes below and decide
            whether to pull them to this device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Profile on server was uploaded at:
              </span>
              <span className="font-mono text-xs">
                {format(data.remote.updatedAt, "yyyy-MM-dd HH:mm:ss")}
              </span>
            </div>
            {data.remote.userAgent && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Browser:</span>
                  <span className="text-xs">
                    {data.remote.userAgent.browser ?? "Unknown"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">OS:</span>
                  <span className="text-xs">
                    {data.remote.userAgent.os ?? "Unknown"}
                  </span>
                </div>
              </>
            )}
          </div>

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
            Cancel pull
          </Button>
          <Button onClick={() => onResolve(true)}>
            <Download className="mr-2 h-4 w-4" />
            Accept remote changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </ConfirmDialog>
  );
}
