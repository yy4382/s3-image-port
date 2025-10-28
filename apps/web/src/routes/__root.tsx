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

export const Route = createRootRoute({
  head: () =>
    produce(
      createHeadTags({
        includeFavicon: true,
      }),
      (draft) => {
        draft.links.push({ rel: "stylesheet", href: globalsCss });
      },
    ),
  component: RootComponent,
});

function RootComponent() {
  const match = useMatch({ from: "/$locale", shouldThrow: false });
  const locale = match?.params.locale;
  return (
    <html suppressHydrationWarning lang={locale ?? "en"}>
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
