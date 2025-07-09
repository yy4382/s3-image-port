import { Profiles } from "@/modules/settings/profiles/profiles";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile Settings - S3 Image Port",
  description: "Manage your profiles for S3 Image Port.",
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Profiles />;
}
