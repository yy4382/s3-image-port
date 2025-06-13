"use client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useTranslations } from "use-intl";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { DialogDescription } from "@radix-ui/react-dialog";

export function InvalidS3Dialog() {
  const t = useTranslations("settings.s3Invalid");
  return (
    <Dialog open={true}>
      <DialogContent showClose={false}>
        <DialogHeader>
          <DialogTitle>{t("s3ConfigTitle")}</DialogTitle>
        </DialogHeader>
        <VisuallyHidden>
          <DialogDescription>{t("s3ConfigDesc")}</DialogDescription>
        </VisuallyHidden>
        <div>
          <p>{t("s3ConfigDesc")}</p>
        </div>
        <DialogFooter>
          <Link
            to="/$locale/settings/s3"
            params={(prev) => ({ locale: prev.locale ?? "en" })}
            className={buttonVariants({ variant: "default" })}
          >
            {t("editLink")}
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
