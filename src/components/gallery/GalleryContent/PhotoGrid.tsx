"use client";

import { Button } from "@/components/ui/button";
import { PaginationWithLogic } from "@/components/ui/paginationLogic";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import McEmptyBox from "~icons/mingcute/empty-box-line.jsx";
import { useFetchPhotoList } from "../galleryStore";
import {
  containerWidthAtom,
  currentPageAtom,
  filteredPhotosCountAtom,
  PER_PAGE,
  photoSizeAtom,
  showingPhotosAtom,
} from "../galleryStore";
import { PhotoItem } from "./PhotoItem/PhotoItem";
import { useTranslations } from "next-intl";

export function PhotoGrid() {
  const photos = useAtomValue(showingPhotosAtom);
  const [page, setPage] = useAtom(currentPageAtom);
  const photoSize = useAtomValue(photoSizeAtom);
  const setContainerWidth = useSetAtom(containerWidthAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const listPhotos = useFetchPhotoList();
  const filteredPhotoCount = useAtomValue(filteredPhotosCountAtom);
  const t = useTranslations("gallery.grid");
  
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
  return (
    <div ref={containerRef} className="max-w-full">
      {photos.length > 0 ? (
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-wrap gap-2 w-full">
            {photos.map((photo, i) => (
              <PhotoItem key={photo.Key} photo={photo} size={photoSize[i]} />
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
        <div className="flex flex-col items-center justify-center w-full h-64 p-8 bg-muted/20 rounded-lg border border-dashed border-muted-foreground/30">
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="h-12 w-12 text-muted-foreground/70">
              {/* Photo icon placeholder */}
              <McEmptyBox className="w-full h-full" />
            </div>
            <p className="text-lg text-muted-foreground text-center">
              {t("noPhotosFound")}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => listPhotos()}
            className="flex items-center gap-2"
          >
            {t("loadPhotos")}
          </Button>
        </div>
      )}
    </div>
  );
}
