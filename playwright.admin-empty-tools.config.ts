import { defineConfig, devices } from "@playwright/test";

const port = "43218";
const hostname = "127.0.0.1";
const baseURL = `http://${hostname}:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["admin-empty-tools-guidance.spec.ts"],
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev --hostname ${hostname} --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: "",
      DIRECT_URL: "",
      SEO_AUDIT_TEST_DATABASE_URL: "",
      NEXT_TELEMETRY_DISABLED: "1",
      ENHE_ADMIN_VISUAL_FIXTURE: "1",
      ENHE_ADMIN_VISUAL_FIXTURE_HOST: hostname,
      ENHE_ADMIN_VISUAL_EMPTY_TOOLS: "1",
      AUTH_COOKIE_NAME: "enhe_session",
      NEXT_PUBLIC_APP_URL: baseURL,
      PORT: port
    }
  }
});
