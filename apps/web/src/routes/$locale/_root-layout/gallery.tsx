import { Gallery } from "@/modules/gallery/Gallery";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";
import { createHeadTags } from "../../../lib/seo";

export const Route = createFileRoute("/$locale/_root-layout/gallery")({
  head: () =>
    createHeadTags({
      title: "Gallery | S3 Image Port",
      description:
        "Browse, search, and manage images stored in your S3 buckets.",
    }),
  component: RouteComponent,
  validateSearch: (search) => ({
    displayOptions: z.string().optional().parse(search.displayOptions),
  }),
});

function RouteComponent() {
  const a = Route.useSearch();
  return <Gallery />;
}
