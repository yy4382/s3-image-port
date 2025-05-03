import { createFileRoute } from "@tanstack/react-router";
import { S3Settings } from "@/components/settings/s3";

export const Route = createFileRoute("/settings/s3")({
  component: RouteComponent,
});

function RouteComponent() {
  return <S3Settings />;
}
