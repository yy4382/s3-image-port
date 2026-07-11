"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  galleryFilterOptionsToSearchParams,
  galleryFilterOptionsFromSearchParams,
} from "../hooks/use-display-control";
import { imageCatalog } from "@/modules/image-catalog";
import {
  galleryPageSizeDefault,
  galleryPageSizeSchema,
} from "@/stores/schemas/gallery/filter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilterIcon, ArrowUpDownIcon } from "lucide-react";
import { FilterPopoverContent } from "./FilterPopoverContent";
import { SortPopoverContent } from "./SortPopoverContent";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { useTranslations } from "use-intl";
import { getRouteApi, useRouterState } from "@tanstack/react-router";
import deepEqual from "fast-deep-equal";

const route = getRouteApi("/$locale/_root-layout/gallery");

function useSyncDisplayAtomAndSearch() {
  const searchParams = route.useSearch();
  const routeNavigationId = useRouterState({
    select: ({ location }) =>
      (
        location.state as typeof location.state & {
          galleryDisplayNavigationId?: number;
        }
      ).galleryDisplayNavigationId,
  });
  const routeLocationKey = useRouterState({
    select: ({ location }) => location.state.__TSR_key,
  });
  const navigate = route.useNavigate();
  const setDisplayOptions = useSetAtom(imageCatalog.view.filter);
  const setCurrentPage = useSetAtom(imageCatalog.view.page);
  const setPageSize = useSetAtom(imageCatalog.view.pageSize);

  const displayOptions = useAtomValue(imageCatalog.view.filter);
  const pageSize = useAtomValue(imageCatalog.view.pageSize);
  const normalizedRoute = useMemo(() => {
    const filter = galleryFilterOptionsFromSearchParams(searchParams);
    const size = galleryPageSizeSchema
      .catch(galleryPageSizeDefault)
      .parse(searchParams.pageSize);
    return {
      filter,
      pageSize: size,
      search: galleryFilterOptionsToSearchParams(filter, size),
    };
  }, [searchParams]);
  const catalogSearch = useMemo(
    () => galleryFilterOptionsToSearchParams(displayOptions, pageSize),
    [displayOptions, pageSize],
  );
  const routeKey = JSON.stringify(normalizedRoute.search);
  const routeIsCanonical = deepEqual(searchParams, normalizedRoute.search);
  const catalogKey = JSON.stringify(catalogSearch);
  const coordination = useRef({
    observedRouteKey: undefined as string | undefined,
    observedLocationKey: undefined as string | undefined,
    suppressedLocationKey: undefined as string | undefined,
    hydratingRouteKey: undefined as string | undefined,
    nextNavigationId: 0,
    pending: undefined as { id: number; key: string } | undefined,
    desired: undefined as
      | { search: typeof catalogSearch; key: string }
      | undefined,
    invalidated: new Map<
      number,
      {
        id: number;
        key: string;
        staleLocationKey?: string;
        eligibleAfterLocationKey?: string;
      }
    >(),
  });

  const navigateOutbound = useCallback(
    (search: typeof catalogSearch, key: string, replace = false) => {
      const sync = coordination.current;
      const id = ++sync.nextNavigationId;
      sync.pending = { id, key };
      sync.desired = undefined;
      startTransition(() => {
        void navigate({
          to: ".",
          search,
          ...(replace ? { replace: true } : {}),
          state: (previous) => ({
            ...previous,
            galleryDisplayNavigationId: id,
          }),
        });
      });
    },
    [navigate],
  );

  // The committed route is authoritative. Hydration is marked in the shared
  // record so the outbound effect does not echo these atom writes back.
  useEffect(() => {
    const sync = coordination.current;
    if (
      sync.observedRouteKey === routeKey &&
      sync.observedLocationKey === routeLocationKey
    ) {
      return;
    }

    sync.observedRouteKey = routeKey;
    sync.observedLocationKey = routeLocationKey;
    sync.suppressedLocationKey = undefined;

    if (
      sync.pending !== undefined &&
      sync.pending.id === routeNavigationId &&
      sync.pending.key === routeKey
    ) {
      sync.pending = undefined;
      sync.hydratingRouteKey = undefined;
      const desired = sync.desired;
      sync.desired = undefined;
      if (desired !== undefined && desired.key !== routeKey) {
        navigateOutbound(desired.search, desired.key);
      }
      return;
    }

    const invalidated =
      routeNavigationId === undefined
        ? undefined
        : sync.invalidated.get(routeNavigationId);
    if (
      routeNavigationId !== undefined &&
      invalidated?.id === routeNavigationId &&
      invalidated.key === routeKey
    ) {
      if (
        invalidated.eligibleAfterLocationKey !== undefined &&
        invalidated.staleLocationKey === routeLocationKey
      ) {
        sync.invalidated.delete(routeNavigationId);
      } else {
        invalidated.staleLocationKey ??= routeLocationKey;
        sync.suppressedLocationKey = routeLocationKey;
        return;
      }
    }

    if (sync.pending !== undefined) {
      sync.invalidated.set(sync.pending.id, { ...sync.pending });
      while (sync.invalidated.size > 16) {
        sync.invalidated.delete(sync.invalidated.keys().next().value!);
      }
      sync.pending = undefined;
      sync.desired = undefined;
    }

    for (const stale of sync.invalidated.values()) {
      if (stale.staleLocationKey !== undefined) {
        stale.eligibleAfterLocationKey = routeLocationKey;
      }
    }

    sync.hydratingRouteKey = routeKey;
    if (catalogKey !== routeKey) {
      setCurrentPage(1);
      setDisplayOptions(normalizedRoute.filter);
      setPageSize(normalizedRoute.pageSize);
      return;
    }

    sync.hydratingRouteKey = undefined;
    if (!routeIsCanonical) {
      navigateOutbound(normalizedRoute.search, routeKey, true);
    }
  }, [
    catalogKey,
    normalizedRoute.filter,
    normalizedRoute.pageSize,
    normalizedRoute.search,
    navigateOutbound,
    routeIsCanonical,
    routeKey,
    routeLocationKey,
    routeNavigationId,
    setCurrentPage,
    setDisplayOptions,
    setPageSize,
  ]);

  // Atom writes remain the caller interface. While one navigation is pending,
  // further writes coalesce into the latest desired search.
  useEffect(() => {
    const sync = coordination.current;
    if (sync.suppressedLocationKey === routeLocationKey) return;

    if (sync.hydratingRouteKey === routeKey) {
      if (catalogKey !== routeKey) return;
      sync.hydratingRouteKey = undefined;
      if (!routeIsCanonical && sync.pending === undefined) {
        navigateOutbound(normalizedRoute.search, routeKey, true);
      }
      return;
    }

    if (sync.pending !== undefined) {
      if (sync.pending.key !== catalogKey) {
        sync.desired = { search: catalogSearch, key: catalogKey };
      } else {
        sync.desired = undefined;
      }
      return;
    }

    if (catalogKey === routeKey) {
      sync.desired = undefined;
      return;
    }

    setCurrentPage(1);
    navigateOutbound(catalogSearch, catalogKey);
  }, [
    catalogKey,
    catalogSearch,
    navigateOutbound,
    normalizedRoute.search,
    routeIsCanonical,
    routeKey,
    routeLocationKey,
    setCurrentPage,
  ]);
}

export function DisplayControl() {
  const [search, handleUpdate] = useAtom(imageCatalog.view.filter);
  useSyncDisplayAtomAndSearch();
  const tFilter = useTranslations("gallery.filter");
  const tSort = useTranslations("gallery.sort");

  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false);

  const isSearchActive = !!search.searchTerm;

  const filterActiveCount = useMemo(() => {
    let count = 0;
    if (search.prefix !== undefined) count++;
    if (search.dateRangeType[0] !== null || search.dateRangeType[1] !== null)
      count++;
    return count;
  }, [search.prefix, search.dateRangeType]);

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder={tFilter("searchPlaceholder")}
        className="grow max-w-72"
        onChange={(e) => {
          handleUpdate((prev) => ({ ...prev, searchTerm: e.target.value }));
        }}
        value={search.searchTerm}
      />
      <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger>
                <NotificationBadge
                  label={filterActiveCount}
                  show={filterActiveCount > 0}
                  variant={"destructiveBackground"}
                >
                  <div className={buttonVariants({ size: "icon" })}>
                    <FilterIcon className="h-4 w-4" />
                  </div>
                </NotificationBadge>
              </PopoverTrigger>
            }
          />
          <TooltipContent>{tFilter("filterOptions")}</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-100">
          <FilterPopoverContent
            currentDisplayOptions={search}
            handleUpdate={(update) =>
              handleUpdate((prev) => ({ ...prev, ...update }))
            }
            setFilterPopoverOpen={setFilterPopoverOpen}
          />
        </PopoverContent>
      </Popover>

      <Popover open={sortPopoverOpen} onOpenChange={setSortPopoverOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <Button
                    aria-label={tSort("sortOptions")}
                    variant="outline"
                    size="icon"
                  >
                    <ArrowUpDownIcon className="h-4 w-4" />
                  </Button>
                }
              />
            }
          />
          <TooltipContent>{tSort("sortOptions")}</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-80">
          <SortPopoverContent
            currentDisplayOptions={search}
            handleUpdate={(update) =>
              handleUpdate((prev) => ({ ...prev, ...update }))
            }
            isSearchActive={isSearchActive}
            setSortPopoverOpen={setSortPopoverOpen}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
