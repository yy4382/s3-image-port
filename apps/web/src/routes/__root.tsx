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
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RootErrorComponent,
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
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 10, // 10 minutes
          },
        },
      }),
  );

  return (
    <html suppressHydrationWarning {...(locale && { lang: locale })}>
      <head>
        <HeadContent />
      </head>
      <body>
        {/* base-ui requires an isolate root. https://base-ui.com/react/overview/quick-start#portals */}
        <div id="app-root" className="isolate">
          <JotaiProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
              storageKey="s3ip:root:theme"
            >
              <QueryClientProvider client={queryClient}>
                <Outlet />
                <Toaster />
              </QueryClientProvider>
            </ThemeProvider>
          </JotaiProvider>
        </div>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}

function RootErrorComponent() {
  const [showWarning, setShowWarning] = React.useState(false);

  const handleClearStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    } catch {
      // Silently fail if localStorage is not available
      window.location.href = "/";
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Error - Something went wrong</title>
        <link rel="stylesheet" href={globalsCss} />
      </head>
      <body className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-lg w-full bg-card rounded-lg p-8 shadow-sm border">
          <h1 className="text-2xl font-bold mb-4 text-destructive">
            ⚠️ Something went wrong
          </h1>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            An unrecoverable error has occurred. This is usually a temporary
            issue that can be resolved by trying one of the following options:
          </p>

          <div className="flex flex-col gap-3 mt-6">
            <Button onClick={handleRefresh} className="w-full">
              🔄 Refresh the page
            </Button>
            <Button
              onClick={handleGoHome}
              variant="secondary"
              className="w-full"
            >
              🏠 Go to home page
            </Button>
          </div>

          {!showWarning && (
            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-2">
                If the above options don't work:
              </p>
              <Button
                onClick={() => setShowWarning(true)}
                variant="secondary"
                className="w-full"
              >
                Clear all stored data
              </Button>
            </div>
          )}

          {showWarning && (
            <div className="mt-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-4">
              <div className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                ⚠️ Warning
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed mb-3">
                This will clear all locally stored data including settings,
                preferences, and any cached information. You will need to
                reconfigure the application after this action.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleClearStorage}
                  variant="destructive"
                  className="flex-1"
                >
                  Clear and restart
                </Button>
                <Button
                  onClick={() => setShowWarning(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
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
