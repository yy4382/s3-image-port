import { redirect } from "@/i18n/navigation";

export default function RootLanguageRedirect() {
  return redirect({ href: "/", locale: "en" });
}
