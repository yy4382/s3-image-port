import { S3Settings } from "@/modules/settings/s3/s3";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/_root-layout/settings/s3")({
  component: RouteComponent,
});

function RouteComponent() {
  return <S3Settings />;
}
