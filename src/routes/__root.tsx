import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/header/theme-provider";
import Header from "@/components/header/Header";

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider defaultTheme="system" storageKey="s3ip:root:theme">
      <div className="bg-background text-foreground min-h-screen max-w-screen flex flex-col gap-6">
        <div className="p-2 flex gap-2 max-w-7xl mx-auto px-4 w-full">
          <Header />
        </div>

        <div className="max-w-7xl mx-auto px-4 w-full">
          <Outlet />
        </div>
        <Toaster />
        <TanStackRouterDevtools />
      </div>
    </ThemeProvider>
  ),
});
