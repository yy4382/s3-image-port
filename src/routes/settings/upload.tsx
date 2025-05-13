import { UploadSettings } from "@/components/settings/upload";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/upload")({
  component: UploadSettings,
});
