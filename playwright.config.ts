import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    ...devices["iPad Pro 11 landscape"],
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    channel: "chrome",
    serviceWorkers: "allow",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview -- --port 4173",
    port: 4173,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
