import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import Icons from "unplugin-icons/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import tailwindcss from "@tailwindcss/vite";
import type { BrowserCommand } from "vitest/node";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export const grantPermissions: BrowserCommand<[string[]]> = async (
  ctx,
  arg1: string[],
) => {
  if (ctx.provider.name === "playwright") {
    await ctx.context.grantPermissions(arg1);
  }
};

export default defineConfig({
  plugins: [
    Icons({ compiler: "jsx", jsx: "react" }),
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({ router: { entry: "main.tsx" } }),
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
      commands: { grantPermissions },
    },
  },
});

declare module "vitest/browser" {
  interface BrowserCommands {
    grantPermissions: (permissions: string[]) => Promise<void>;
  }
}
