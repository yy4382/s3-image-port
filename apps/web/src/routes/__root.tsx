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
              <Outlet />
              <Toaster />
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
    } catch (error) {
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
      <body className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-lg w-full bg-white rounded-lg p-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-4 text-red-600">
            ⚠️ Something went wrong
          </h1>
          <p className="mb-4 leading-relaxed text-gray-600">
            An unrecoverable error has occurred. This is usually a temporary
            issue that can be resolved by trying one of the following options:
          </p>

          <div className="flex flex-col gap-3 mt-6">
            <button
              onClick={handleRefresh}
              className="w-full px-4 py-2.5 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              🔄 Refresh the page
            </button>
            <button
              onClick={handleGoHome}
              className="w-full px-4 py-2.5 rounded-md text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              🏠 Go to home page
            </button>
          </div>

          {!showWarning && (
            <div className="mt-6">
              <p className="text-sm text-gray-500 mb-2">
                If the above options don't work:
              </p>
              <button
                onClick={() => setShowWarning(true)}
                className="w-full px-4 py-2.5 rounded-md text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Clear all stored data
              </button>
            </div>
          )}

          {showWarning && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-4">
              <div className="font-semibold text-amber-900 mb-2">
                ⚠️ Warning
              </div>
              <p className="text-sm text-amber-800 leading-relaxed mb-3">
                This will clear all locally stored data including settings,
                preferences, and any cached information. You will need to
                reconfigure the application after this action.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleClearStorage}
                  className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  Clear and restart
                </button>
                <button
                  onClick={() => setShowWarning(false)}
                  className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </button>
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
