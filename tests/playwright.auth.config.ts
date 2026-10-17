import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import base from "../playwright.config";

if (process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER !== "1" || !process.env.DATABASE_URL || process.env.ENHE_E2E_ALLOW_DATABASE_MUTATION !== "1") {
  throw new Error("Authentication integration checks require a production build and an explicit local test database.");
}

export default defineConfig({
  ...base,
  testDir: resolve(__dirname, "e2e"),
  testMatch: ["auth-slide-submit.spec.ts", "register-gender-avatar.spec.ts"],
  outputDir: resolve(__dirname, "../test-results"),
  workers: 1,
  webServer: {
    ...base.webServer,
    command: "node scripts/start-standalone.cjs",
    cwd: resolve(__dirname, ".."),
    reuseExistingServer: false,
  },
});
