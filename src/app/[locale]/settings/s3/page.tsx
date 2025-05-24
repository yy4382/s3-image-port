import { S3Settings } from "@/components/settings/s3";
import { setRequestLocale } from "next-intl/server";

export default async function S3Page({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <S3Settings />;
}
