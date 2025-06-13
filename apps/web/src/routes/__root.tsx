import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  Link,
  useMatchRoute,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { Provider as JotaiProvider } from "jotai";
import globalCss from "@/styles/globals.css?url";
import { routing } from "@/i18n/routing";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "S3 Image Port" },
      {
        name: "og:image",
        content: "https://imageport.app/og.png",
      },
      {
        name: "og:title",
        content: "S3 Image Port",
      },
      {
        name: "og:description",
        content: "Manage your images in S3",
      },
      {
        name: "og:url",
        content: "https://imageport.app",
      },
      {
        name: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: "S3 Image Port",
      },

      {
        name: "twitter:description",
        content: "Manage your images in S3",
      },
      {
        name: "twitter:image",
        content: "https://imageport.app/og.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: globalCss },
      { rel: "icon", href: "/favicon.svg" },
      { rel: "canonical", href: "https://imageport.app" },
    ],
  }),

  component: RootLayout,
});

function RootLayout() {
  const matchRoute = useMatchRoute();
  const params = matchRoute({ to: "/$locale" });

  const locale = params
    ? routing.locales.includes(params.locale as "en" | "zh")
      ? params.locale
      : "en"
    : "en";

  return (
    <html lang={locale} suppressHydrationWarning>
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
