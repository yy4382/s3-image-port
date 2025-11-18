import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Upload, Download } from "lucide-react";
import { type UserConfirmations } from "../../actions/sync";
import { format } from "date-fns";
import { SettingsViewer } from "../settings-viewer";
import { ConfirmDialog } from "./confirm-dialog";
import { useTranslations } from "use-intl";

export function ConfirmConflictDialog({
  open,
  data,
  onResolve,
}: {
  open: boolean;
  data: Parameters<UserConfirmations["conflictResolver"]>[0] | null;
  onResolve: (value: "local" | "remote" | null) => void;
}) {
  const t = useTranslations("settings.sync.conflictDialog");

  if (!data) return null;

  return (
    <ConfirmDialog
      open={open}
      onResolve={(value) => onResolve(value ? null : null)}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm">
            {t.rich("uploadedAt", {
              time: () => (
                <code className="font-mono font-semibold">
                  {format(data.remote.updatedAt, "yyyy-MM-dd HH:mm:ss")}
                </code>
              ),
              browser: () => (
                <code className="font-mono font-semibold">
                  {data.remote.userAgent?.browser ?? "Unknown browser"}
                </code>
              ),
              os: () => (
                <code className="font-mono font-semibold">
                  {data.remote.userAgent?.os ?? "Unknown OS"}
                </code>
              ),
            })}
          </p>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{t("comparison")}</h4>
            <div className="max-h-[400px] overflow-y-auto">
              <SettingsViewer
                localData={data.local.data}
                remoteData={data.remote.data.data}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onResolve(null)}
            className="sm:flex-1"
          >
            {t("cancel")}
          </Button>
          <Button
            variant="outline"
            onClick={() => onResolve("remote")}
            className="sm:flex-1"
          >
            <Download />
            {t("useRemote")}
          </Button>
          <Button onClick={() => onResolve("local")} className="sm:flex-1">
            <Upload />
            {t("useLocal")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </ConfirmDialog>
  );
}
