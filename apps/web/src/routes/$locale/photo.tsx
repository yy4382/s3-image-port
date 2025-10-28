import PhotoModal from "@/modules/photo/PhotoModal";
import { createFileRoute } from "@tanstack/react-router";
import { createHeadTags } from "../../lib/seo";

export const Route = createFileRoute("/$locale/photo")({
  head: () =>
    createHeadTags({
      title: "Photo | S3 Image Port",
      description: "Inspect image metadata and preview individual assets.",
    }),
  component: RouteComponent,
  validateSearch: (search) => {
    return {
      imagePath: search.imagePath,
      galleryState: search.galleryState,
    };
  },
});

function RouteComponent() {
  return <PhotoModal />;
}
