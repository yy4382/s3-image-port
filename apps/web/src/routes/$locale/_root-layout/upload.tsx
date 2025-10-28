import { Upload } from "@/modules/upload/upload";
import { createFileRoute } from "@tanstack/react-router";
import { createHeadTags } from "../../../lib/seo";

export const Route = createFileRoute("/$locale/_root-layout/upload")({
  head: () =>
    createHeadTags({
      title: "Upload | S3 Image Port",
      description: "Upload new images directly into your S3 buckets.",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  return <Upload />;
}
