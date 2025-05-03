import { createFileRoute } from "@tanstack/react-router";
import { Gallery } from "@/components/gallery/gallery";

export const Route = createFileRoute("/gallery")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Gallery />;
}
