import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import Icons from "unplugin-icons/vite";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    react(),
    Icons({
      compiler: "jsx",
      jsx: "react",
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup/cleanup.ts"],
    coverage: {
      include: ["src/**/*"],
    },
  },
});
