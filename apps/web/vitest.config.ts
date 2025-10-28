import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./test/setup/cleanup.ts"],
      coverage: {
        include: ["src/**/*"],
      },
    },
  }),
);
