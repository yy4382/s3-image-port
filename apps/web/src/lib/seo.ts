import type {
  DetailedHTMLProps,
  LinkHTMLAttributes,
  MetaHTMLAttributes,
} from "react";

const SITE_URL = "https://imageport.app";
const DEFAULT_TITLE = "S3 Image Port";
const DEFAULT_DESCRIPTION = "Manage your images in S3";
const OG_IMAGE_PATH = "/og.png";
const OG_IMAGE_ALT = "S3 Image Port Site Preview";

export type HeadOptions = {
  title?: string;
  description?: string;
  locale?: string;
  includeFavicon?: boolean;
};

export function createHeadTags({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  locale,
  includeFavicon = false,
}: HeadOptions = {}) {
  const imageUrl = new URL(OG_IMAGE_PATH, SITE_URL).toString();

  const meta: Array<
    DetailedHTMLProps<MetaHTMLAttributes<HTMLMetaElement>, HTMLMetaElement>
  > = [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: OG_IMAGE_ALT },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
  ];

  if (locale) {
    meta.push({ property: "og:locale", content: locale });
  }

  const links: Array<
    DetailedHTMLProps<LinkHTMLAttributes<HTMLLinkElement>, HTMLLinkElement>
  > = [...(includeFavicon ? [{ rel: "icon", href: "/favicon.svg" }] : [])];

  return {
    meta,
    links,
  };
}

export const seoDefaults = {
  siteUrl: SITE_URL,
  defaultTitle: DEFAULT_TITLE,
  defaultDescription: DEFAULT_DESCRIPTION,
} as const;
