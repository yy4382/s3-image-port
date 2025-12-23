// vite.ci.config.ts

// This is a fast-building config to generate useful files for CI. e.g. `.source/index.ts`, or `next-env.d.ts`
// This config is not intended to be used for real build output.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
// import analyzer from "vite-bundle-analyzer";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import mdx from "fumadocs-mdx/vite";
// import { nitro } from "nitro/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    Icons({ compiler: "jsx", jsx: "react" }),
    mdx(await import("./source.config")),
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      router: { entry: "main.tsx" },
    }),
    react({
      // babel: {
      //   plugins: ["babel-plugin-react-compiler"],
      // },
    }),
    // nitro(),
    // process.env.ANALYZE === "true" ? analyzer() : undefined,
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("fumadocs")) {
            return "fumadocs";
          }
          return null;
        },
      },
    },
  },
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
