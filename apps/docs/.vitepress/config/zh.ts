import { defineConfig, type DefaultTheme } from "vitepress";
export const zh = defineConfig({
  lang: "zh-CN",
  description: "A dashboard to manage your images in S3 and S3-like buckets.",
  themeConfig: {
    nav: [
      {
        text: "指南",
        link: "/zh/guide/what-is-sip",
        activeMatch: "/zh/guide/",
      },
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
        { text: "自部署指南", link: "self-deployment" },
      ],
    },
    {
      text: "S3 储存桶设置",
      collapsed: false,
      items: [{ text: "Cloudflare R2 逐步指南", link: "for-cloudflare-r2" }],
    },
    {
      text: "小技巧",
      collapsed: false,
      items: [
        {
          text: "利用 WebP Cloud Services 扩展 Public URL 功能 ",
          link: "use-webp-cloud-services",
        },
      ],
    },
  ];
}
