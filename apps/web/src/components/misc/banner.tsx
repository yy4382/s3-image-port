"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface BannerProps {
  defaultVisible?: boolean;
}

const Banner = ({ defaultVisible = true }: BannerProps) => {
  const [isVisible, setIsVisible] = useState(defaultVisible);
  const t = useTranslations("banner");

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <section className="w-full border-b bg-white dark:bg-black px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-center">
          <span className="text-sm">
            <span className="font-medium">{t("title")}</span>{" "}
            <span className="text-muted-foreground">
              {t.rich("description", {
                a: (chunks) => (
                  <a
                    href="https://iport.yfi.moe"
                    className="underline underline-offset-4 hover:text-foreground"
                    target="_blank"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </span>
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="-mr-2 h-8 w-8 flex-none"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
};

export { Banner };
