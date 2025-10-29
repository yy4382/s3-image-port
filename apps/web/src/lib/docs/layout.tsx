import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { i18n } from "./i18n";
import { CircleArrowOutUpLeftIcon } from "lucide-react";

export function baseOptions(locale: string): BaseLayoutProps {
  return {
    i18n,
    nav: {
      title: (
        <>
          <img
            src="/favicon.svg" // Assuming favicon is in public root
            className="pointer-events-none ml-1.5"
            alt="favicon"
            aria-hidden="true"
            width={24}
            height={24}
          />
          <span className="text-xl font-bold hidden md:block">
            S3 Image Port
          </span>
        </>
      ),
    },
    githubUrl: "https://github.com/yy4382/s3-image-port",
    links: [
      {
        on: "nav",
        text: locale === "zh" ? "返回图库面板" : "Back to Gallery Panel",
        icon: <CircleArrowOutUpLeftIcon />,
        url: `/${locale}/gallery`,
      },
    ],
  };
}
