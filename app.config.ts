import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";
import fs from "fs";
import { paraglideVitePlugin as paraglide } from "@inlang/paraglide-js";

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
      paraglide({
        project: "./project.inlang",
        outdir: "./src/paraglide",
        strategy: ["url", "baseLocale"],
        urlPatterns: [
          {
            pattern: "/:path(.*)?",
            localized: [
              ["zh", "/zh/:path(.*)?"],
              ["en", "/:path(.*)?"],
            ],
          },
        ],
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
    worker: {
      format: "es",
    },
  },
  tsr: {
    appDirectory: "src",
  },
  server: {
    prerender: {
      routes: ["/", "/zh", "/404"],
    },
    static: true,
    hooks: {
      "prerender:generate": (route, nitro) => {
        if (!nitro.options.prerender.autoSubfolderIndex) return;
        if (route.route === "/404") {
          route.fileName = route.fileName?.replace(
            "404/index.html",
            "404.html",
          );
        }
      },
      close: () => {
        // Remove the 404.html override from the Vercel config
        // This is a workaround for the Vercel issue where the 404.html override
        // is not removed when the prerendering is done
        // and the app is deployed to Vercel.
        const vercelConfig = path.resolve(
          process.cwd(),
          ".vercel/output/config.json",
        );
        // check if the file exists
        if (!fs.existsSync(vercelConfig)) {
          return;
        }
        try {
          const config = fs.readFileSync(vercelConfig, "utf-8");
          const parsedConfig = JSON.parse(config);
          const overrides = parsedConfig["overrides"];
          const modifiedOverrides = Object.entries(overrides).filter((item) => {
            if (item[0] === "404.html") {
              return false;
            }
            return true;
          });
          const newOverrides = Object.fromEntries(modifiedOverrides);
          parsedConfig["overrides"] = newOverrides;
          fs.writeFileSync(vercelConfig, JSON.stringify(parsedConfig, null, 2));
          console.log("Vercel config updated successfully.");
        } catch (err) {
          console.error("Error reading Vercel config:", err);
        }
      },
    },
  },
});
