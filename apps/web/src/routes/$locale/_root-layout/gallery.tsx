import { Gallery } from "@/modules/gallery/Gallery";
import { createFileRoute } from "@tanstack/react-router";
import { createHeadTags } from "../../../lib/seo";
import { galleryFilterSearchParamsSchema } from "@/stores/schemas/gallery/filter";

export const Route = createFileRoute("/$locale/_root-layout/gallery")({
  head: () =>
    createHeadTags({
      title: "Gallery | S3 Image Port",
      description:
        "Browse, search, and manage images stored in your S3 buckets.",
    }),
  component: RouteComponent,
  validateSearch: galleryFilterSearchParamsSchema,
});

function RouteComponent() {
  return <Gallery />;
}
