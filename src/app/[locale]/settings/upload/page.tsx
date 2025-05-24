import { UploadSettings } from "@/components/settings/upload";
import { setRequestLocale } from "next-intl/server";

export default async function UploadPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <UploadSettings />;
}
