import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import { visualizer } from "rollup-plugin-visualizer";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    Icons({ compiler: "jsx", jsx: "react" }),
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react({
      babel: {
        presets: ["jotai/babel/preset"],
        plugins: [["babel-plugin-react-compiler", {}]],
      },
    }),
    visualizer({ gzipSize: true }),
  ],
  optimizeDeps: {
    exclude: [
      "@jsquash/png",
      "@jsquash/jpeg",
      "@jsquash/webp",
      "@jsquash/avif",
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // awsSdkS3: ["@aws-sdk/client-s3"],
          // shared: ["zod", "date-fns", "mime"],
        },
      },
    },
  },
  worker: {
    format: "es",
  },
  server: {
    port: 3000,
  },
});
