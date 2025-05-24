"use client";
import { redirect } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function ImageModal() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const path = useMemo(() => {
    return searchParams.get("imagePath");
  }, [searchParams]);

  if (!path) {
    return redirect({ href: "/gallery", locale });
  }

  return <div>{path}</div>;
}
