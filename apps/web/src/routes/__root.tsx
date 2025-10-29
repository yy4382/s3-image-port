import * as React from "react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useMatch,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { Provider as JotaiProvider } from "jotai";
import { createHeadTags } from "../lib/seo";
import globalsCss from "@/styles/globals.css?url";
import { produce } from "immer";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";

export const Route = createRootRoute({
  component: RootComponent,
  head: () =>
    produce(createHeadTags({ includeFavicon: true }), (draft) => {
      draft.links.push({ rel: "stylesheet", href: globalsCss });
      draft.meta.push({
        name: "viewport",
        content: "width=device-width, initial-scale=1.0",
      });
      draft.meta.push({ name: "charset", content: "utf-8" });
      draft.links.push({ rel: "sitemap", href: "/sitemap.xml" });
    }),
});

function RootComponent() {
  const locale = useSetHtmlLang();

  return (
    <html suppressHydrationWarning {...(locale && { lang: locale })}>
      <head>
        <HeadContent />
      </head>
      <body>
        <JotaiProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="s3ip:root:theme"
          >
            <Outlet />
            <Toaster />
          </ThemeProvider>
        </JotaiProvider>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}

function useSetHtmlLang() {
  const locale = useMatch({
    from: "/$locale",
    shouldThrow: false,
    select: (data) => data.params.locale,
  });

  useEffect(() => {
    document.documentElement.lang = locale ?? "en";
  }, [locale]);
  return locale;
}
