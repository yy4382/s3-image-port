import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { ConfirmDialog } from "./confirm-dialog";
import { useTranslations } from "use-intl";

export function ConfirmDeleteDialog({
  open,
  onResolve,
}: {
  open: boolean;
  onResolve: (value: boolean) => void;
}) {
  const t = useTranslations("settings.sync.deleteDialog");

  return (
    <ConfirmDialog open={open} onResolve={onResolve}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onResolve(false)}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={() => onResolve(true)}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </ConfirmDialog>
  );
}
