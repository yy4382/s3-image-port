import { GallerySettings } from "@/components/settings/gallery";
import { setRequestLocale } from "next-intl/server";

export default async function GallerySettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GallerySettings />;
}
