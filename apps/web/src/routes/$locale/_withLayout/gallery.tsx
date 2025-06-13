import { createFileRoute, SearchSchemaInput } from "@tanstack/react-router";
import { Gallery } from "@/modules/gallery/Gallery";
import {
  DisplayOptions,
  displayOptionsSchema,
} from "@/modules/gallery/GalleryControl/displayControlStore";

export const Route = createFileRoute("/$locale/_withLayout/gallery")({
  component: RouteComponent,
  validateSearch: (
    search: Partial<DisplayOptions> & SearchSchemaInput,
  ): DisplayOptions => {
    return displayOptionsSchema.parse(search);
  },
});

function RouteComponent() {
  return <Gallery />;
}
