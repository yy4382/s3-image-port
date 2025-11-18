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
import { useTranslations } from "use-intl";

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
  const t = useTranslations("settings.sync.tokenViewer");

  const handleClear = () => {
    if (confirm(t("clearConfirm"))) {
      onDelete();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <TokenDisplay token={token} />

          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium mb-1">{t("securityWarning.title")}</p>
              <p className="text-yellow-700 dark:text-yellow-300">
                {t("securityWarning.description")}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={handleClear}>
            <Trash2 />
            {t("clearButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
