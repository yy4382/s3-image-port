import ImageModal from "@/components/image/ImageModal";
import { setRequestLocale } from "next-intl/server";

export default async function ImagePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ImageModal />;
}
