import { defineConfig, type DefaultTheme } from "vitepress";
export const en = defineConfig({
  lang: "en-US",
  description: "A dashboard to manage your images in S3 and S3-like buckets.",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/getting-started", activeMatch: "/guide/" },
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
      items: [{ text: "Getting Started", link: "getting-started" }],
    },
  ];
}
