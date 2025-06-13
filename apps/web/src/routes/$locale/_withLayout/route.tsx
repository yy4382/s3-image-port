import Header from "@/components/header/Header";
import { Banner } from "@/components/misc/banner";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/_withLayout")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <div className="fixed top-0 bottom-0 left-0 right-0 -z-10 bg-grid-image dark:hidden"></div>
      <div className="dark:bg-background text-foreground min-h-screen w-screen flex flex-col gap-6">
        <div className="grid">
          <Banner />
          <div className="p-2 flex gap-2 max-w-7xl mx-auto px-4 w-full">
            <Header />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 w-full flex-1 flex">
          <Outlet />
        </div>
      </div>
    </>
  );
}
