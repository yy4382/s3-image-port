import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { Provider as JotaiProvider } from "jotai";
import globalCss from "@/styles/globals.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "TanStack Start" },
    ],
    links: [
      { rel: "stylesheet", href: globalCss },
      { rel: "icon", href: "/favicon.svg" },
    ],
  }),

  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en" suppressHydrationWarning>
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
            <Link
              to="/$locale"
              aria-hidden
              className="hidden"
              params={{ locale: "en" }}
            />
            <Link
              to="/$locale"
              aria-hidden
              className="hidden"
              params={{ locale: "zh" }}
            />
            <Outlet />
            <Toaster />
            <Scripts />
          </ThemeProvider>
        </JotaiProvider>
      </body>
    </html>
  );
}
