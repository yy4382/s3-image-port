import { createFileRoute, Navigate } from "@tanstack/react-router";
import { getPersistedLocale } from "@/lib/locale";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Navigate to="/$locale" params={{ locale: getPersistedLocale() }} />;
}
