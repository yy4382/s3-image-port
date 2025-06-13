import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <a href="/en">To English</a>
      <a href="/zh">To Chinese</a>
      {/* <Navigate to="/$locale" params={{ locale: "en" }} /> */}
    </div>
  );
}
