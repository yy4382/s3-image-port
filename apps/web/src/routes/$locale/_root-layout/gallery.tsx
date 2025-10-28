import { Gallery } from "@/modules/gallery/Gallery";
import { createFileRoute } from "@tanstack/react-router";
import { createHeadTags } from "../../../lib/seo";
import { displayOptionsSearchSchema } from "@/modules/gallery/GalleryControl/displayControlStore";

export const Route = createFileRoute("/$locale/_root-layout/gallery")({
  head: () =>
    createHeadTags({
      title: "Gallery | S3 Image Port",
      description:
        "Browse, search, and manage images stored in your S3 buckets.",
    }),
  component: RouteComponent,
  validateSearch: displayOptionsSearchSchema,
});

function RouteComponent() {
  return <Gallery />;
}
