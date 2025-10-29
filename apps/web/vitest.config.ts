import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import Icons from "unplugin-icons/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [Icons({ compiler: "jsx", jsx: "react" }), tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup/cleanup.ts"],
    coverage: {
      include: ["src/**/*"],
    },
  },
});
