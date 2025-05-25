import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";

export default async function SettingsPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  return redirect({
    href: "/settings/profile",
    locale,
  });
}
