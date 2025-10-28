import PhotoModal from "@/modules/photo/PhotoModal";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { createHeadTags } from "../../lib/seo";
import { z } from "zod";

export const Route = createFileRoute("/$locale/photo")({
  head: () =>
    createHeadTags({
      title: "Photo | S3 Image Port",
      description: "Inspect image metadata and preview individual assets.",
    }),
  component: RouteComponent,
  errorComponent: () => (
    <Navigate
      to="/$locale/gallery"
      from="/$locale/photo"
      params={(prev) => ({ locale: prev.locale })}
      search={(prev) => JSON.parse(prev.galleryState ?? "{}")}
    />
  ),
  validateSearch: (search) => {
    return {
      imagePath: z.string().parse(search.imagePath),
      galleryState: z.string().optional().parse(search.galleryState),
    };
  },
});

function RouteComponent() {
  return <PhotoModal />;
}
