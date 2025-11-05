import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import Icons from "unplugin-icons/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  plugins: [Icons({ compiler: "jsx", jsx: "react" }), tsconfigPaths(), react()],
  test: {
    setupFiles: ["./test/setup/cleanup.ts"],
    coverage: {
      include: ["src/**/*"],
    },
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});
