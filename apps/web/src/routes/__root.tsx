import * as React from "react";
import { HeadContent, Outlet, createRootRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { Provider as JotaiProvider } from "jotai";
import { createHeadTags } from "../lib/seo";

export const Route = createRootRoute({
  head: () =>
    createHeadTags({
      includeFavicon: true,
    }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <HeadContent />
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
    </>
  );
}
