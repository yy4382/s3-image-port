import { Onboard } from "@/modules/onboard/onboard";
import { setRequestLocale } from "next-intl/server";

export default async function OnboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Onboard />;
}
