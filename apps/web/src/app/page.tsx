import { redirect } from "@/i18n/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "S3 Image Port",
  description: "Access your S3 Image Port.",
};

export default function RootLanguageRedirect() {
  return redirect({ href: "/", locale: "en" });
}
