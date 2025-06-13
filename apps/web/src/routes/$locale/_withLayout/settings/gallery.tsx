import { GallerySettings } from "@/modules/settings/gallery/gallery";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/_withLayout/settings/gallery")({
  component: RouteComponent,
});

function RouteComponent() {
  return <GallerySettings />;
}
