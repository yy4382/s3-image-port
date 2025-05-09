import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";
import fs from "fs";

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
    prerender: {
      routes: ["/", "/404"],
    },
    static: true,
    hooks: {
      "prerender:generate": (route) => {
        if (route.route === "/404") {
          route.fileName = route.fileName?.replace(
            "404/index.html",
            "404.html",
          );
        }
      },
      "prerender:done": (route) => {
        console.log(route.prerenderedRoutes);
        const staticDir = path.resolve(process.cwd(), ".vercel/output/static");
        try {
          const files = fs.readdirSync(staticDir, { recursive: true });
          console.log("Files in .vercel/output/static:", files);
        } catch (err) {
          console.error("Error reading .vercel/output/static:", err);
        }
      },
    },
  },
});
