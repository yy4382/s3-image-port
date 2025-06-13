import { PhotoModal } from "@/modules/photo/PhotoModal";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/image/$key")({
  component: RouteComponent,
});

function RouteComponent() {
  const { key } = Route.useParams();
  return <PhotoModal path={key} />;
}
