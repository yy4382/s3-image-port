"use client";

import { Button } from "@/components/ui/button";
import { PaginationWithLogic } from "@/components/ui/paginationLogic";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useRef } from "react";
import McEmptyBox from "~icons/mingcute/empty-box-line.jsx";
import {} from "../use-photo-list";
import {
  currentPageAtom,
  filteredPhotosCountAtom,
  PER_PAGE,
  useFetchPhotoList,
  showingPhotosAtom,
} from "../use-photo-list";
import { containerWidthAtom, photoSizeAtom } from "../use-calculate-layout";
import { PhotoItem } from "./PhotoItem/PhotoItem";
import { useTranslations } from "use-intl";
import { Loader2 } from "lucide-react";
import { selectedPhotosAtom } from "../use-select";

export function PhotoGrid() {
  const photos = useAtomValue(showingPhotosAtom);
  const [page, setPage] = useAtom(currentPageAtom);
  const photoSize = useAtomValue(photoSizeAtom);
  const setContainerWidth = useSetAtom(containerWidthAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const filteredPhotoCount = useAtomValue(filteredPhotosCountAtom);
  const setSelectedPhotos = useSetAtom(selectedPhotosAtom);

  useEffect(() => {
    setContainerWidth(containerRef.current?.clientWidth ?? 600); // Set initial width immediately

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === containerRef.current) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(containerRef.current!);
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
      if (event.key.toLocaleLowerCase() === "a") {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          setSelectedPhotos((prev) => {
            const newSet = new Set(prev);
            for (const photo of photos) {
              newSet.add(photo.Key);
            }
            return newSet;
          });
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photos, setSelectedPhotos]);

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
                key={photo.Key}
                photo={photo}
                size={photoSize[i].size}
                position={photoSize[i].position}
              />
            ))}
          </div>
          <PaginationWithLogic
            page={page}
            totalCount={filteredPhotoCount}
            pageSize={PER_PAGE}
            onPageChange={(p) => {
              setPage(p);
            }}
          />
        </div>
      ) : (
        <PhotoGridEmpty />
      )}
    </div>
  );
}

function PhotoGridEmpty() {
  const t = useTranslations("gallery.grid");
  const { fetchPhotoList, isLoading } = useFetchPhotoList();
  return (
    <div className="flex flex-col items-center justify-center w-full h-64 p-8 bg-muted/20 rounded-lg border border-dashed border-muted-foreground/30">
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="h-12 w-12 text-muted-foreground/70">
          <McEmptyBox className="w-full h-full" />
        </div>
        <p className="text-lg text-muted-foreground text-center">
          {t("noPhotosFound")}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => fetchPhotoList()}
        className="flex items-center gap-2"
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {t("loadPhotos")}
      </Button>
    </div>
  );
}
