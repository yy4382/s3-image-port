import { LinkWithActive } from "@/components/misc/link-with-active";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - S3 Image Port",
  description: "Configure your S3 Image Port settings.",
};

export default async function SettingsLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("settings");

  return (
    <div className="flex flex-col gap-4 max-w-4xl w-full mx-auto">
      <Card className="h-fit">
        <CardContent className="flex flex-col md:grid md:grid-cols-[auto_1fr] gap-4">
          <div className="flex flex-col gap-4 md:min-w-48">
            <h1 className="text-2xl font-bold ml-2">{t("title")}</h1>
            <SettingPageSwitcher />
          </div>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingPageSwitcher() {
  const t = useTranslations("settings");

  return (
    <div className="flex flex-col gap-2 mb-4 md:mb-0">
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
      <LinkWithActive
        href="/settings/gallery"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "justify-start data-[status=active]:bg-muted data-[status=active]:hover:bg-accent",
        )}
      >
        {t("gallery.title")}
      </LinkWithActive>
    </div>
  );
}
