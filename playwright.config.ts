import { defineConfig, devices } from "@playwright/test";

const rawPort = process.env.PORT ?? "3000";
if (!/^\d+$/.test(rawPort)) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const numericPort = Number(rawPort);
if (!Number.isSafeInteger(numericPort) || numericPort < 1 || numericPort > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const port = String(numericPort);
const useProductionServer = process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === "1";
const useAdminVisualFixture = process.env.ENHE_ADMIN_VISUAL_FIXTURE === "1";
const allowDatabaseMutation = process.env.ENHE_E2E_ALLOW_DATABASE_MUTATION === "1";
const fixtureHost = "127.0.0.1";
const explicitBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim();
const baseURL = explicitBaseURL ?? `http://${fixtureHost}:${port}`;
const isDatabaseFree = !process.env.DATABASE_URL?.trim();
const baseURLUrl = new URL(baseURL);
const expectedPort = new URL(`http://${fixtureHost}:${port}`).port;
const baseURLHostname = baseURLUrl.hostname;
const isLoopbackBaseURL = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(baseURLHostname);
const databaseUrl = process.env.DATABASE_URL?.trim();
const databaseFreeTestIgnore = isDatabaseFree
  ? [
      "**/commercial-flow.spec.ts",
      "**/public-navigation-search.spec.ts",
      "**/seo-audit-commercial.spec.ts",
    ]
  : [];
const configuredDatabaseTestIgnore = isDatabaseFree
  ? []
  : [
      "**/ai-news-topics-index.spec.ts",
      "**/auth-shell-dbfree.spec.ts",
      "**/byox-route-navigation.spec.ts",
      "**/public-final-contrast.spec.ts",
    ];

if (!isLoopbackBaseURL) {
  throw new Error("Playwright tests can only target a loopback URL; remote targets are disabled.");
}

if (
  explicitBaseURL &&
  (baseURLUrl.protocol !== "http:" ||
    baseURLUrl.hostname !== fixtureHost ||
    baseURLUrl.port !== expectedPort ||
    baseURLUrl.pathname !== "/" ||
    baseURLUrl.search !== "" ||
    baseURLUrl.hash !== "" ||
    baseURLUrl.username !== "" ||
    baseURLUrl.password !== "")
) {
  throw new Error("PLAYWRIGHT_BASE_URL must match the same loopback server started by PORT.");
}

if (databaseUrl) {
  let database: URL;
  let databaseName = "";
  try {
    database = new URL(databaseUrl);
    databaseName = decodeURIComponent(database.pathname.replace(/^\/+/, ""));
  } catch {
    throw new Error("Playwright database tests require a dedicated local PostgreSQL test/e2e database.");
  }
  if (
    !["postgres:", "postgresql:"].includes(database.protocol) ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(database.hostname) ||
    !/(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(databaseName) ||
    /(?:^|[_-])(prod|production|live)(?:[_-]|$)/i.test(databaseName)
  ) {
    throw new Error("Playwright database tests require a dedicated local PostgreSQL test/e2e database.");
  }
  if (!allowDatabaseMutation) {
    throw new Error("Set ENHE_E2E_ALLOW_DATABASE_MUTATION=1 to run Playwright with a configured test database.");
  }
}

if (
  useAdminVisualFixture &&
  (useProductionServer || process.env.NODE_ENV === "production" || !isDatabaseFree || !["localhost", fixtureHost].includes(new URL(baseURL).hostname))
) {
  throw new Error("The admin visual fixture requires a local, database-free development server.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: [
    "**/admin-visual-fixture.spec.ts",
    "**/admin-*-visual-fixture.spec.ts",
    "**/admin-empty-tools-guidance.spec.ts",
    "**/admin-shell-accessibility-matrix.spec.ts",
    "**/admin-populated-accessibility.spec.ts",
    ...(useProductionServer ? ["**/software-catalog-preview.spec.ts"] : []),
    ...databaseFreeTestIgnore,
    ...configuredDatabaseTestIgnore,
  ],
  fullyParallel: false,
  workers: useProductionServer ? 2 : isDatabaseFree ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
  webServer: {
    command: useProductionServer
      ? "node scripts/start-production-e2e.cjs"
      : useAdminVisualFixture
        ? `npm exec -- next dev --hostname ${fixtureHost} --port ${port}`
        : `npm run dev -- --hostname ${fixtureHost} --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    env: {
      HOSTNAME: fixtureHost,
      NEXT_TELEMETRY_DISABLED: "1",
      DATABASE_URL: databaseUrl ?? "",
      DIRECT_URL: databaseUrl ?? "",
      SEO_AUDIT_TEST_DATABASE_URL: "",
      ...(useAdminVisualFixture
        ? {
            ENHE_ADMIN_VISUAL_FIXTURE_HOST: fixtureHost,
            NEXT_PUBLIC_APP_URL: baseURL,
          }
        : {}),
    },
    timeout: 120 * 1000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
