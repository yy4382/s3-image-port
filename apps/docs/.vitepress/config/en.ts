import { defineConfig, type DefaultTheme } from "vitepress";
export const en = defineConfig({
  lang: "en-US",
  description: "A dashboard to manage your images in S3 and S3-like buckets.",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/what-is-sip", activeMatch: "/guide/" },
      { text: "Start using", link: "https://imageport.app" },
    ],
    sidebar: {
      "/guide/": { base: "/guide/", items: sidebarGuide() },
    },
  },
});

function sidebarGuide(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: "Introduction",
      collapsed: false,
      items: [
        { text: "What is S3 Image Port?", link: "what-is-sip" },
        { text: "Getting Started", link: "getting-started" },
      ],
    },
    {
      text: "Bucket Setup Guides",
      collapsed: false,
      items: [
        {
          text: "Cloudflare R2",
          link: "for-cloudflare-r2",
        },
      ],
    },
    {
      text: "Tips & Tricks",
      collapsed: false,
      items: [
        {
          text: "Extending Public URL Functionality with WebP Cloud Services",
          link: "use-webp-cloud-services",
        },
      ],
    },
  ];
}
