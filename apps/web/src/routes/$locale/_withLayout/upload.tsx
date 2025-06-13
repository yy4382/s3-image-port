import { Upload } from "@/modules/upload/upload";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/_withLayout/upload")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Upload />;
}
