import { LinkWithActive } from "@/components/misc/link-with-active";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";

export default function SettingsLayout({ children }: PropsWithChildren) {
  const t = useTranslations("settings");
  
  return (
    <Card className="max-w-4xl w-full mx-auto h-fit">
      <CardContent className="grid grid-cols-[auto_1fr] gap-4">
        <div className="flex flex-col gap-4 min-w-48">
          <h1 className="text-2xl font-bold ml-2">{t("title")}</h1>
          <SettingPageSwitcher />
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function SettingPageSwitcher() {
  const t = useTranslations("settings");
  
  return (
    <div className="flex flex-col gap-2">
      <LinkWithActive
        href="/settings/profile"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "justify-start data-[status=active]:bg-muted data-[status=active]:hover:bg-accent",
        )}
      >
        {t("profilesName")}
      </LinkWithActive>
      <LinkWithActive
        href="/settings/s3"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "justify-start data-[status=active]:bg-muted data-[status=active]:hover:bg-accent",
        )}
      >
        S3
      </LinkWithActive>
      <LinkWithActive
        href="/settings/upload"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "justify-start data-[status=active]:bg-muted data-[status=active]:hover:bg-accent",
        )}
      >
        {t("upload")}
      </LinkWithActive>
    </div>
  );
}
