import { Profiles } from "@/components/settings/profiles";
import { setRequestLocale } from "next-intl/server";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Profiles />;
}
