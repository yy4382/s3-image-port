import PhotoModal from "@/components/photo/PhotoModal";
import { setRequestLocale } from "next-intl/server";

export default async function ImagePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PhotoModal />;
}
