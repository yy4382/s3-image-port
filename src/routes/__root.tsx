import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRoute({
  component: () => (
    <div className="bg-background text-foreground min-h-screen max-w-screen grid gap-6">
      <div className="p-2 flex gap-2 max-w-7xl mx-auto px-4">
        <Link to="/" className="[&.active]:font-bold">
          Home
        </Link>{" "}
        <Link to="/about" className="[&.active]:font-bold">
          About
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <Outlet />
      </div>
      <Toaster />
      <TanStackRouterDevtools />
    </div>
  ),
});
