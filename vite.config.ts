import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { stampServiceWorker } from "./scripts/stamp-service-worker.ts";

const distFile = (name: string) => fileURLToPath(new URL(`./dist/${name}`, import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    {
      name: "stamp-service-worker-cache",
      apply: "build",
      async closeBundle() {
        await stampServiceWorker(distFile("index.html"), distFile("sw.js"), [
          distFile("manifest.webmanifest"),
          distFile("audio/demo-groove.wav"),
          distFile("icons/apple-touch-icon.png"),
          distFile("icons/icon-192.png"),
          distFile("icons/icon-512.png"),
        ]);
      },
    },
  ],
  test: {
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    restoreMocks: true,
    pool: "forks",
  },
});
