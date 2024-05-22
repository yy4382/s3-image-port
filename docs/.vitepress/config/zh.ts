import { defineConfig, type DefaultTheme } from "vitepress";
export const zh = defineConfig({
  lang: "zh-CN",
  description: "A dashboard to manage your images in S3 and S3-like buckets.",
  themeConfig: {
    nav: [
      { text: "指南", link: "/guide/what-is-sip", activeMatch: "/zh/guide/" },
      { text: "官方实例", link: "https://iport.yfi.moe" },
    ],
    sidebar: {
      "/zh/guide/": { base: "/zh/guide/", items: sidebarGuide() },
    },
  },
});

function sidebarGuide(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: "介绍",
      collapsed: false,
      items: [
        { text: "什么是 S3 Image Port？", link: "what-is-sip" },
        { text: "开始使用", link: "getting-started" },
      ],
    },
  ];
}
