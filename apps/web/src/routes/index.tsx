import { createFileRoute, Navigate } from "@tanstack/react-router";
import { createHeadTags } from "../lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    createHeadTags({
      path: "/",
      description: "Access your S3 Image Port.",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  return <Navigate to="/$locale" params={{ locale: "en" }} />;
}
