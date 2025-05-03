import { createFileRoute } from "@tanstack/react-router";
import { Upload } from "@/components/upload/upload";

export const Route = createFileRoute("/upload")({
  component: Upload,
});
