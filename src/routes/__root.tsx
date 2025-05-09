import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/header/theme-provider";
import Header from "@/components/header/Header";
import indexCss from "@/index.css?url";
import setThemeJs from "@/utils/headSetTheme?raw";

export const Route = createRootRoute({
  head: () => ({
    links: [
      { rel: "stylesheet", href: indexCss },
      { rel: "icon", href: "favicon.svg" },
    ],
    scripts: [
      {
        children: setThemeJs,
      },
    ],
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "S3 Image Port",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg">Page not found</p>
    </div>
  ),
  component: () => (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey="s3ip:root:theme">
          <div className="fixed top-0 bottom-0 left-0 right-0 -z-10 bg-grid-image dark:hidden"></div>
          <div className="dark:bg-background text-foreground min-h-screen w-screen flex flex-col gap-6">
            <div className="p-2 flex gap-2 max-w-7xl mx-auto px-4 w-full">
              <Header />
            </div>

            <div className="max-w-7xl mx-auto px-4 w-full flex-1 flex">
              <Outlet />
            </div>
            <Toaster />
            <TanStackRouterDevtools />
          </div>
        </ThemeProvider>{" "}
        <Scripts />
      </body>
    </html>
  ),
});
