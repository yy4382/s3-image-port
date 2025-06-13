import { UploadSettings } from "@/modules/settings/upload/upload";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/_withLayout/settings/upload")({
  component: RouteComponent,
});

function RouteComponent() {
  return <UploadSettings />;
}
