import { Onboard } from "@/modules/onboard/onboard";
import { stepSchemaDisplay } from "@/modules/onboard/onboard-util";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/onboard")({
  component: RouteComponent,
  validateSearch: (search): { step: number } => {
    return { step: stepSchemaDisplay.catch(1).parse(search.step) };
  },
});

function RouteComponent() {
  return <Onboard />;
}
