import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/404")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg">Page not found</p>
    </div>
  );
}
