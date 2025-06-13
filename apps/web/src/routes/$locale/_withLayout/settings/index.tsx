import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/_withLayout/settings/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Navigate from={Route.fullPath} to="/$locale/settings/profiles" />;
}
