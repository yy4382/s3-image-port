import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/header/theme-provider";
import Header from "@/components/header/Header";
import { DevTools } from "jotai-devtools";
import css from "jotai-devtools/styles.css?inline";

const JotaiDevTools = () =>
  process.env.NODE_ENV !== "production" ? (
    <>
      <style>{css}</style>
      <DevTools />
    </>
  ) : null;

export const Route = createRootRoute({
  component: () => (
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
        <JotaiDevTools />
      </div>
    </ThemeProvider>
  ),
});
