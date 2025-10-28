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
import { useTranslations, useLocale } from "use-intl";

export function InvalidS3Dialog() {
  const t = useTranslations("settings.s3Invalid");
  const locale = useLocale();
  return (
    <Dialog open={true}>
      <DialogContent showClose={false}>
        <DialogHeader>
          <DialogTitle>{t("s3ConfigTitle")}</DialogTitle>
        </DialogHeader>
        <div>
          <p>{t("s3ConfigDesc")}</p>
        </div>
        <DialogFooter>
          <Link
            to="/$locale/settings/s3"
            params={{ locale }}
            className={buttonVariants({ variant: "default" })}
          >
            {t("editLink")}
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
