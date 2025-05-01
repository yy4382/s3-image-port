import { Card, CardContent } from "@/components/ui/card";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Card className="max-w-192 mx-auto">
      <CardContent className="grid grid-cols-[auto_1fr] gap-4">
        <SettingPageSwitcher />
        <Outlet />
      </CardContent>
    </Card>
  );
}

function SettingPageSwitcher() {
  return (
    <div className="grid gap-2 min-w-32">
      <Link to="/settings/s3">S3</Link>
    </div>
  );
}
