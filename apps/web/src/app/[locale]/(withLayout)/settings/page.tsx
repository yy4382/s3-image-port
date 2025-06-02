import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - S3 Image Port",
  description: "Access your S3 Image Port settings.",
};

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
