// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import analyzer from "vite-bundle-analyzer";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    Icons({ compiler: "jsx", jsx: "react" }),
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      router: { entry: "main.tsx" },
      spa: {
        enabled: true,
        prerender: {
          enabled: true,
          crawlLinks: true,
        },
      },
      prerender: {
        filter: ({ path }) => {
          return ["/en", "/zh", "/"].includes(path);
        },
      },
      pages: [
        {
          path: "/en",
          prerender: { enabled: true },
        },
        {
          path: "/zh",
          prerender: { enabled: true },
        },
      ],
    }),
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
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
