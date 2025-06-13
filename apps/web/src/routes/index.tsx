import { routing } from "@/i18n/routing";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  useEffect(() => {
    const lang =
      navigator.languages
        .map((lang) => {
          return new Intl.Locale(lang).language;
        })
        .find((lang) => routing.locales.includes(lang as any)) ??
      routing.defaultLocale;

    navigate({
      to: "/$locale",
      params: { locale: lang },
      replace: true,
    });
  }, []);
  return (
    <div>
      <h1>Redirecting...</h1>
      <div>
        If you are not redirected, please click
        <a className="underline" href="/en">
          here
        </a>
      </div>
    </div>
  );
}
