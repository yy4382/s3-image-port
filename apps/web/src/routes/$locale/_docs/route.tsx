import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { defineI18nUI } from "fumadocs-ui/i18n";
import { i18n } from "@/lib/docs/i18n";
import SearchDialog from "@/lib/docs/search";
import { useEffect } from "react";

const { provider } = defineI18nUI(i18n, {
  translations: {
    zh: {
      displayName: "简体中文",
      search: "搜索",
      toc: "目录",
      previousPage: "上一页",
      nextPage: "下一页",
      chooseLanguage: "选择语言",
    },
    en: {
      displayName: "English",
    },
  },
});

export const Route = createFileRoute("/$locale/_docs")({
  component: RouteComponent,
});

function RouteComponent() {
  const { locale } = Route.useParams();

  // The router's default scroll seems not working in docs on first load, so we need to handle it manually.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const element = document.getElementById(hash.slice(1));
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <RootProvider
        i18n={provider(locale)}
        theme={{ enabled: false }}
        search={{ SearchDialog }}
      >
        <Outlet />
      </RootProvider>
    </div>
  );
}
