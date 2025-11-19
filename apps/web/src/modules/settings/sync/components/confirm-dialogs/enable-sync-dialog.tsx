import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Key, RefreshCwIcon, Clock } from "lucide-react";
import { ConfirmDialog } from "./confirm-dialog";
import { useTranslations } from "use-intl";
import { PROFILE_TTL_SECONDS } from "@/lib/redis/ttl-config";

interface EnableSyncDialogProps {
  open: boolean;
  onResolve: (value: boolean) => void;
}

function getTTLDays(): number | null {
  if (!PROFILE_TTL_SECONDS || PROFILE_TTL_SECONDS === Infinity) {
    return null;
  }
  return Math.floor(PROFILE_TTL_SECONDS / 60 / 60 / 24);
}

export function EnableSyncDialog({ open, onResolve }: EnableSyncDialogProps) {
  const t = useTranslations("settings.sync.enableDialog");
  const ttlDays = getTTLDays();

  return (
    <ConfirmDialog open={open} onResolve={onResolve}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCwIcon className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
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
              {t("encryption.title")}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("encryption.description")}
            </p>
          </div>

          {/* Token storage */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Key className="h-4 w-4" />
              {t("tokenStorage.title")}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("tokenStorage.description")}
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
              {t("security.title")}
            </h4>
            <div className="text-sm space-y-2">
              <p className="text-muted-foreground leading-relaxed">
                {t("security.risk")}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {t("security.acceptable")}
              </p>
            </div>
          </div>

          {/* Data retention */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t("dataRetention.title")}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {ttlDays
                ? t("dataRetention.description", { days: ttlDays })
                : t("dataRetention.descriptionForever")}
            </p>
          </div>

          {/* Best practices */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <p className="font-medium text-blue-900 dark:text-blue-100 text-sm mb-2">
              {t("bestPractice.title")}
            </p>
            <p className="text-sm text-blue-900/80 dark:text-blue-100/80 leading-relaxed">
              {t("bestPractice.description")}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onResolve(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={() => onResolve(true)}>{t("confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </ConfirmDialog>
  );
}
