import { Profiles } from "@/modules/settings/profiles";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/_withLayout/settings/profiles")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Profiles />;
}
