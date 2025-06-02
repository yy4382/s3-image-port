import { UploadSettings } from "@/modules/settings/upload";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload Settings - S3 Image Port",
  description: "Configure your upload settings for S3 Image Port.",
};

export default async function UploadPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <UploadSettings />;
}
