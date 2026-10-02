import { defineConfig, devices } from "@playwright/test";

const rawPort = process.env.ADMIN_VISUAL_PORT ?? "43217";
if (!/^\d+$/.test(rawPort)) {
  throw new Error("ADMIN_VISUAL_PORT must be an integer from 1 through 65535.");
}
const port = Number(rawPort);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
  throw new Error("ADMIN_VISUAL_PORT must be an integer from 1 through 65535.");
}
const hostname = "127.0.0.1";
const baseURL = `http://${hostname}:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["admin-shell.spec.ts", "admin-visual-fixture.spec.ts", "admin-user-visual-fixture.spec.ts", "admin-order-payment-visual-fixture.spec.ts", "admin-refund-payment-codes-license-visual-fixture.spec.ts", "admin-settings-visual-fixture.spec.ts", "admin-plans-visual-fixture.spec.ts", "admin-shell-accessibility-matrix.spec.ts", "admin-operations-visual-fixture.spec.ts", "admin-populated-accessibility.spec.ts"],
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
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
      AUTH_COOKIE_NAME: "enhe_session",
      NEXT_PUBLIC_APP_URL: baseURL,
      PORT: String(port)
    }
  }
});
