import PhotoModal from "@/components/photo/PhotoModal";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "View Image - S3 Image Port",
  description: "View a specific image from your S3 bucket.",
};

export default async function ImagePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense
      fallback={<div className="h-screen w-screen bg-background dark" />}
    >
      <PhotoModal />
    </Suspense>
  );
}
