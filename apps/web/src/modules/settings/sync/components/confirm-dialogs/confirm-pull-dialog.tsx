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
import { useTranslations } from "use-intl";

export function ConfirmPullDialog({
  open,
  data,
  onResolve,
}: {
  open: boolean;
  data: Parameters<UserConfirmations["confirmPull"]>[0] | null;
  onResolve: (value: boolean) => void;
}) {
  const t = useTranslations("settings.sync.pullDialog");

  if (!data) return null;

  return (
    <ConfirmDialog open={open} onResolve={onResolve}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onResolve(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={() => onResolve(true)}>
            <Download />
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </ConfirmDialog>
  );
}
