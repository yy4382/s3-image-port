import { defineConfig, type DefaultTheme } from "vitepress";
export const en = defineConfig({
  lang: "en-US",
  description: "A dashboard to manage your images in S3 and S3-like buckets.",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/what-is-sip", activeMatch: "/guide/" },
      { text: "Official Instance", link: "https://iport.yfi.moe" },
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
  ];
}
