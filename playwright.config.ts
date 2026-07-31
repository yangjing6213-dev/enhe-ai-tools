import { defineConfig, devices } from "@playwright/test";

const port = process.env.PORT ?? "3000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const useProductionServer = process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: useProductionServer ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
  webServer: {
    command: useProductionServer
      ? "node scripts/start-production-e2e.cjs"
      : `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI && !useProductionServer,
    timeout: 120 * 1000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
