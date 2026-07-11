import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { StoredImage } from "@/modules/image-storage";
import { getRouteApi } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "use-intl";
import { useTranslations } from "use-intl";
import McCheckFill from "~icons/mingcute/checkbox-fill";
import McCopy from "~icons/mingcute/copy-2-line.jsx";
import { PhotoOptions } from "./photo-options";
import { imageCatalog } from "@/modules/image-catalog";
import { useSetAtom } from "jotai";
import { useCopy } from "@/lib/hooks/use-copy";

type PhotoItemOverlayProps = {
  photo: StoredImage;
  selected: boolean;
  hovering: boolean;
  reserved: boolean;
};

export function PhotoItemOverlay({
  photo,
  selected,
  hovering,
  reserved,
}: PhotoItemOverlayProps) {
  const t = useTranslations("gallery.item.options");
  const updateSelection = useSetAtom(imageCatalog.view.selection);
  const onOpenModal = useOpenModal(photo.key);
  const [infoDropdownOpened, setInfoDropdownOpened] = useState(false);

  const showOverlay = useMemo(() => {
    return hovering || selected || infoDropdownOpened;
  }, [hovering, selected, infoDropdownOpened]);

  return (
    <motion.div
      className="absolute inset-0 z-20"
      aria-busy={reserved}
      animate={{
        visibility: showOverlay ? "visible" : "hidden",
        opacity: showOverlay ? 1 : 0,
      }}
      transition={{ ease: "easeInOut", duration: 0.15 }}
    >
      {/* The gray background */}
      <button
        type="button"
        aria-label={`${t("open")}: ${photo.key}`}
        className="absolute inset-0 border-0 bg-transparent p-0 text-left"
        onClick={(e) => {
          updateSelection({
            type: "toggle",
            key: photo.key,
            checked: "toggle",
            shift: e.shiftKey,
          });
        }}
        onDoubleClick={onOpenModal}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onOpenModal();
          }
        }}
      >
        <div className="absolute top-0 h-14 left-0 right-0 bg-gradient-to-bottom" />
      </button>

      <ImageCheckbox
        label={t("selectPhoto", { key: photo.key })}
        checked={selected}
        onCheckedChange={(c, e) => {
          updateSelection({
            type: "toggle",
            key: photo.key,
            checked: !!c,
            shift: (e.nativeEvent as PointerEvent).shiftKey,
          });
        }}
        className={cn("absolute top-2 left-2", {
          "opacity-100! pointer-events-auto!": selected,
        })}
      />
      <div
        className={cn("absolute right-4 top-4 flex items-center gap-2", {
          "opacity-50": reserved,
        })}
      >
        <PhotoActionCopyLink photo={photo} disabled={reserved} />
        <PhotoOptions
          photo={photo}
          opened={infoDropdownOpened}
          setOpened={setInfoDropdownOpened}
          onOpen={onOpenModal}
          disabled={reserved}
        />
      </div>
    </motion.div>
  );
}

function PhotoActionCopyLink({
  className,
  photo,
  disabled,
}: {
  className?: string;
  photo: StoredImage;
  disabled: boolean;
}) {
  const runCatalog = useSetAtom(imageCatalog.run);
  const { copy } = useCopy();
  const t = useTranslations("gallery.item.options");
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={t("copyUrl")}
            variant="secondary"
            size="icon-sm"
            className={className}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              void runCatalog({
                type: "access",
                key: photo.key,
                purpose: "url",
              }).then((outcome) => {
                if (
                  mounted.current &&
                  outcome.status === "accessed" &&
                  outcome.purpose === "url"
                ) {
                  copy(outcome.value, "URL");
                }
              });
            }}
          >
            <McCopy />
          </Button>
        }
      />
      <TooltipContent>{t("copyUrl")}</TooltipContent>
    </Tooltip>
  );
}

function ImageCheckbox({
  className,
  checked,
  label,
  onCheckedChange,
}: {
  defaultChecked?: boolean;
  className?: string;
  checked?: boolean;
  label: string;
  onCheckedChange: (
    checked: boolean,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-label={label}
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      className={cn(
        "peer relative group data-[state=checked]:text-primary text-white/80 hover:text-white focus-visible:border-ring focus-visible:ring-ring/50 size-8 shrink-0 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onClick={(e) => {
        e.preventDefault();
        onCheckedChange(!checked, e);
      }}
    >
      <div className="inset-[5px] absolute group-data-[state=checked]:bg-white dark:group-data-[state=checked]:bg-black z-10"></div>
      <span className="flex items-center justify-center text-current transition-none">
        <McCheckFill className="size-8 z-20" />
      </span>
    </button>
  );
}

const route = getRouteApi("/$locale/_root-layout/gallery");
function useOpenModal(s3Key: string) {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const locale = useLocale();

  return useCallback(() => {
    if (!s3Key) return;

    navigate({
      to: "/$locale/photo",
      params: { locale },
      search: { imagePath: s3Key, galleryState: JSON.stringify(search) },
    });
  }, [search, s3Key, locale, navigate]);
}
