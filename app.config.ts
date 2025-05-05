import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  react: {
    babel: {
      presets: ["jotai/babel/preset"],
      plugins: [["babel-plugin-react-compiler", {}]],
    },
  },
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tailwindcss(),
      Icons({ compiler: "jsx", jsx: "react" }),
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
    worker: {
      format: "es",
    },
  },
  tsr: {
    appDirectory: "src",
  },
  server: {
    static: true,
  },
});
