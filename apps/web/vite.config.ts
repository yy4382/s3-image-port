// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import Icons from "unplugin-icons/vite";

export default defineConfig({
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

  plugins: [
    tailwindcss(),
    // Enables Vite to resolve imports using path aliases.
    tsconfigPaths(),
    Icons({ compiler: "jsx", jsx: "react" }),
    tanstackStart({
      target: "static",
      spa: {
        enabled: true,
        maskPath: "/en",
        prerender: {
          enabled: true,
          crawlLinks: true,
          retryCount: 3,
        },
      },
      // prerender: {
      //   enabled: true,
      //   filter: () => true,
      //   crawlLinks: true,
      // },
    }),
  ],
});
