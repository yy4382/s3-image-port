"use client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buttonVariants } from "../ui/button";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function InvalidS3Dialog() {
  const t = useTranslations("settings.s3Invalid");
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
            href="/settings/s3"
            className={buttonVariants({ variant: "default" })}
          >
            {t("editLink")}
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
