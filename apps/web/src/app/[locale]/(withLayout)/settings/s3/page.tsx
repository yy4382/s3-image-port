import { S3Settings } from "@/modules/settings/s3/s3";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "S3 Settings - S3 Image Port",
  description: "Configure your S3 settings for S3 Image Port.",
};

export default async function S3Page({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <S3Settings />;
}
