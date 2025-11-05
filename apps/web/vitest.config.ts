import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import Icons from "unplugin-icons/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    Icons({ compiler: "jsx", jsx: "react" }),
    tsconfigPaths(),
    tailwindcss(),
    react(),
  ],
  test: {
    setupFiles: ["./test/setup/cleanup.ts"],
    coverage: {
      include: ["src/**/*"],
    },
    expect: { poll: { timeout: 5000 } },
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});
