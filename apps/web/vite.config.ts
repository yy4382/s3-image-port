// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import analyzer from "vite-bundle-analyzer";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import mdx from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    Icons({ compiler: "jsx", jsx: "react" }),
    mdx(await import("./source.config")),
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      router: { entry: "main.tsx" },
      sitemap: {
        enabled: true,
        host: process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "https://imageport.app",
      },
      spa: {
        enabled: true,
        prerender: {
          enabled: true,
          crawlLinks: true,
        },
      },
      prerender: {
        filter: ({ path }) => {
          if (["/en", "/zh", "/"].includes(path)) return true;
          if (path.includes("/docs") && !path.includes("/#")) {
            return true;
          }
          return false;
        },
      },
      pages: [
        { path: "/en", prerender: { enabled: true } },
        { path: "/zh", prerender: { enabled: true } },
        { path: "/api/search", prerender: { enabled: true } },
      ],
    }),
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    nitro(),
    process.env.ANALYZE === "true" ? analyzer() : undefined,
  ],
  server: {
    port: 3000,
  },
  optimizeDeps: {
    exclude: [
      "@jsquash/avif",
      "@jsquash/jpeg",
      "@jsquash/jxl",
      "@jsquash/png",
      "@jsquash/webp",
    ],
  },
  worker: {
    format: "es",
  },
});
