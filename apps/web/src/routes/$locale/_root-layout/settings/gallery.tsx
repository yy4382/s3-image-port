import { GallerySettings } from "@/modules/settings/gallery/gallery";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/_root-layout/settings/gallery")({
  component: RouteComponent,
});

function RouteComponent() {
  return <GallerySettings />;
}
