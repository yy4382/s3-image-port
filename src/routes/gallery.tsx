import { createFileRoute } from "@tanstack/react-router";
import { Gallery } from "@/components/gallery/Gallery";
import { zodValidator } from "@tanstack/zod-adapter";
import { photoListDisplayOptionsSchema } from "@/components/gallery/galleryStore";

export const Route = createFileRoute("/gallery")({
  component: RouteComponent,
  validateSearch: zodValidator(photoListDisplayOptionsSchema),
});

function RouteComponent() {
  return <Gallery />;
}
