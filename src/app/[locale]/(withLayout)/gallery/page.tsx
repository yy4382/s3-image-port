import { Gallery } from "@/components/gallery/Gallery";
import { setRequestLocale } from "next-intl/server";

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Gallery />;
}
