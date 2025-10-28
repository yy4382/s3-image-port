import { Profiles } from "@/modules/settings/profiles/profiles";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/_root-layout/settings/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Profiles />;
}
