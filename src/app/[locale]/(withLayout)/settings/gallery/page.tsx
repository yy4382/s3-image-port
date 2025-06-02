import { GallerySettings } from "@/modules/settings/gallery/gallery";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery Settings - S3 Image Port",
  description: "Configure your gallery settings for S3 Image Port.",
};

export default async function GallerySettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GallerySettings />;
}
