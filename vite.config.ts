import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import Icons from "unplugin-icons/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    Icons({ compiler: "jsx", jsx: "react" }),
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: [
      "@jsquash/png",
      "@jsquash/jpeg",
      "@jsquash/webp",
      "@jsquash/avif",
    ],
  },
  server: {
    port: 3000,
  },
});
