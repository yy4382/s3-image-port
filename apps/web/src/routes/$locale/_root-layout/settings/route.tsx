import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

export const Route = createFileRoute("/$locale/_root-layout/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const t = useTranslations("settings");

  return (
    <div className="flex flex-col gap-4 max-w-4xl w-full mx-auto">
      <Card className="h-fit">
        <CardContent className="flex flex-col md:grid md:grid-cols-[auto_1fr] gap-4">
          <div className="flex flex-col gap-4 md:min-w-48">
            <h1 className="text-2xl font-bold ml-2">{t("title")}</h1>
            <SettingPageSwitcher />
          </div>
          <Outlet />
        </CardContent>
      </Card>
    </div>
  );
}

function SettingPageSwitcher() {
  const t = useTranslations("settings");

  return (
    <div className="flex flex-col gap-2 mb-4 md:mb-0">
      <Link
        from="/$locale/settings"
        to="/$locale/settings/profile"
        params={(prev) => ({ locale: prev.locale })}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "justify-start data-[status=active]:bg-muted data-[status=active]:hover:bg-accent",
        )}
      >
        {t("profilesName")}
      </Link>
      <Link
        from="/$locale/settings"
        to="/$locale/settings/s3"
        params={(prev) => ({ locale: prev.locale })}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "justify-start data-[status=active]:bg-muted data-[status=active]:hover:bg-accent",
        )}
      >
        S3
      </Link>
      <Link
        from="/$locale/settings"
        to="/$locale/settings/upload"
        params={(prev) => ({ locale: prev.locale })}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "justify-start data-[status=active]:bg-muted data-[status=active]:hover:bg-accent",
        )}
      >
        {t("upload")}
      </Link>
      <Link
        from="/$locale/settings"
        to="/$locale/settings/gallery"
        params={(prev) => ({ locale: prev.locale })}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "justify-start data-[status=active]:bg-muted data-[status=active]:hover:bg-accent",
        )}
      >
        {t("gallery.title")}
      </Link>
    </div>
  );
}
