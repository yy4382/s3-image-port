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
        <style
          dangerouslySetInnerHTML={{
            __html: `
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: system-ui, -apple-system, sans-serif; background: #f9fafb; color: #111827; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1rem; }
              .container { max-width: 32rem; width: 100%; background: white; border-radius: 0.5rem; padding: 2rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); }
              h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: #dc2626; }
              p { margin-bottom: 1rem; line-height: 1.6; color: #4b5563; }
              .button-group { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem; }
              button { padding: 0.625rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; }
              button:hover { opacity: 0.9; }
              button:focus { outline: 2px solid; outline-offset: 2px; }
              .btn-primary { background: #2563eb; color: white; }
              .btn-primary:focus { outline-color: #3b82f6; }
              .btn-secondary { background: #6b7280; color: white; }
              .btn-secondary:focus { outline-color: #9ca3af; }
              .btn-destructive { background: #dc2626; color: white; }
              .btn-destructive:focus { outline-color: #ef4444; }
              .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 0.375rem; padding: 1rem; margin-top: 1rem; }
              .warning-title { font-weight: 600; color: #92400e; margin-bottom: 0.5rem; }
              .warning-text { font-size: 0.875rem; color: #78350f; }
              .warning-buttons { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
            `,
          }}
        />
      </head>
      <body>
        <div className="container">
          <h1>⚠️ Something went wrong</h1>
          <p>
            An unrecoverable error has occurred. This is usually a temporary
            issue that can be resolved by trying one of the following options:
          </p>

          <div className="button-group">
            <button onClick={handleRefresh} className="btn-primary">
              🔄 Refresh the page
            </button>
            <button onClick={handleGoHome} className="btn-secondary">
              🏠 Go to home page
            </button>
          </div>

          {!showWarning && (
            <div style={{ marginTop: "1.5rem" }}>
              <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                If the above options don't work:
              </p>
              <button
                onClick={() => setShowWarning(true)}
                className="btn-secondary"
                style={{ marginTop: "0.5rem", width: "100%" }}
              >
                Clear all stored data
              </button>
            </div>
          )}

          {showWarning && (
            <div className="warning">
              <div className="warning-title">⚠️ Warning</div>
              <p className="warning-text">
                This will clear all locally stored data including settings,
                preferences, and any cached information. You will need to
                reconfigure the application after this action.
              </p>
              <div className="warning-buttons">
                <button onClick={handleClearStorage} className="btn-destructive">
                  Clear and restart
                </button>
                <button
                  onClick={() => setShowWarning(false)}
                  className="btn-secondary"
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
