"use client";

import { Button } from "@/components/ui/button";
import { PaginationWithLogic } from "@/components/ui/paginationLogic";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { selectAtom } from "jotai/utils";
import { useCallback, useEffect, useMemo, useRef } from "react";
import McEmptyBox from "~icons/mingcute/empty-box-line.jsx";
import {
  containerWidthAtom,
  photoSizeAtom,
} from "../hooks/use-calculate-layout";
import { PhotoItem } from "./PhotoItem/PhotoItem";
import { useTranslations } from "use-intl";
import { Loader2 } from "lucide-react";
import { settings } from "@/stores/atoms/settings";
import { imageCatalog } from "@/modules/image-catalog";
import {
  galleryPageSizeDefault,
  galleryPageSizeSchema,
  galleryPageSizes,
} from "@/stores/schemas/gallery/filter";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

const includePathAtom = selectAtom(
  settings.storage,
  ({ raw }) => raw.includePath,
);
const showingPhotosAtom = selectAtom(
  imageCatalog.state,
  ({ gallery }) => gallery.currentPageImages,
);
const filteredPhotosCountAtom = selectAtom(
  imageCatalog.state,
  ({ gallery }) => gallery.filteredCount,
);
const isRefreshingAtom = selectAtom(
  imageCatalog.state,
  ({ refresh }) => refresh.status === "refreshing",
);

export function PhotoGrid() {
  const photos = useAtomValue(showingPhotosAtom);
  const photoSize = useAtomValue(photoSizeAtom);
  const setContainerWidth = useSetAtom(containerWidthAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const updateSelection = useSetAtom(imageCatalog.view.selection);
  const runCatalog = useSetAtom(imageCatalog.run);
  const tStore = useTranslations("gallery.store");
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadPhotos = useCallback(async () => {
    const outcome = await runCatalog({
      type: "refresh",
      intent: "foreground",
      reason: "empty",
    });
    if (!mounted.current) return;
    if (outcome.status === "refreshed") {
      toast.message(tStore("fetchedPhotos"));
    } else if (outcome.status === "invalid-settings") {
      toast.error(tStore("s3SettingsNotFound"));
    } else if (outcome.status === "refresh-failed") {
      toast.error(tStore("failedToFetchPhotos"));
    }
  }, [runCatalog, tStore]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const measureFrame = requestAnimationFrame(() => {
      setContainerWidth(container.clientWidth ?? 600);
    });

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(container);
    return () => {
      cancelAnimationFrame(measureFrame);
      observer.disconnect();
    };
  }, [setContainerWidth]);

  const containerHeight = useMemo(() => {
    const lastPhoto = photoSize.at(-1);
    if (!lastPhoto) {
      return 0;
    }
    return lastPhoto.position.y + lastPhoto.size.height;
  }, [photoSize]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const editableTarget =
        target instanceof HTMLElement &&
        (target.matches("input, textarea, select") || target.isContentEditable);
      if (event.defaultPrevented || editableTarget) return;

      if (event.key.toLocaleLowerCase() === "a") {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          updateSelection({ type: "select-current-page" });
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [updateSelection]);

  return (
    <div ref={containerRef} className="max-w-full">
      {photos.length > 0 ? (
        <div className="flex flex-col gap-4 w-full">
          <div
            className="w-full relative"
            style={{
              height: containerHeight,
            }}
          >
            {photos.map((photo, i) => (
              <PhotoItem
                key={photo.key}
                photo={photo}
                size={photoSize[i].size}
                position={photoSize[i].position}
              />
            ))}
          </div>
          <GalleryPagination />
        </div>
      ) : (
        <PhotoGridEmpty loadPhotos={loadPhotos} />
      )}
    </div>
  );
}

function PhotoGridEmpty({ loadPhotos }: { loadPhotos: () => Promise<void> }) {
  const t = useTranslations("gallery.grid");
  const isLoading = useAtomValue(isRefreshingAtom);
  const includePath = useAtomValue(includePathAtom);
  const hasIncludePath = includePath.length > 0;

  return (
    <div className="flex flex-col items-center justify-center w-full h-64 p-8 bg-muted/20 rounded-lg border border-dashed border-muted-foreground/30">
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="h-12 w-12 text-muted-foreground/70">
          <McEmptyBox className="w-full h-full" />
        </div>
        <p className="text-lg text-muted-foreground text-center">
          {t("noPhotosFound")}
        </p>
        {hasIncludePath && (
          <p className="text-sm text-muted-foreground/80 text-center max-w-md">
            {t.rich("includePathTip", {
              path: includePath,
              mono: (chunks) => <span className="font-mono">{chunks}</span>,
              link: (chunks) => (
                <Link
                  from="/$locale/gallery"
                  to="/$locale/settings/s3"
                  params={(prev) => ({ locale: prev.locale })}
                  className="underline underline-offset-2 hover:text-primary"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        onClick={loadPhotos}
        className="flex items-center gap-2"
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {t("loadPhotos")}
      </Button>
    </div>
  );
}

function GalleryPagination() {
  const [page, setPage] = useAtom(imageCatalog.view.page);
  const [pageSize, setPageSize] = useAtom(imageCatalog.view.pageSize);
  const filteredPhotoCount = useAtomValue(filteredPhotosCountAtom);
  const t = useTranslations("gallery.pagination");

  const handlePageSizeChange = (newPageSize: number) => {
    const pageSizeValue = galleryPageSizeSchema
      .catch(galleryPageSizeDefault)
      .parse(newPageSize);
    setPageSize(pageSizeValue);
    setPage(1);
  };

  return (
    <PaginationWithLogic
      page={page}
      totalCount={filteredPhotoCount}
      pageSize={pageSize}
      pageSizeSelectOptions={{
        pageSizeOptions: galleryPageSizes,
        label: t("itemsPerPage"),
        onPageSizeChange: handlePageSizeChange,
      }}
      onPageChange={(p) => {
        setPage(p);
      }}
    />
  );
}
