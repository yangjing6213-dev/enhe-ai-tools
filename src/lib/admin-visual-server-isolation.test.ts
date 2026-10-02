import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("admin visual fixture server binding", () => {
  it("passes the loopback marker to the empty-tools fixture server", async () => {
    const { default: config } = await import("../../playwright.admin-empty-tools.config");

    expect(config.use?.baseURL).toBe("http://127.0.0.1:43218");
    const webServer = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;
    expect(webServer?.command).toContain("--hostname 127.0.0.1");
    expect(webServer?.reuseExistingServer).toBe(false);
    expect(webServer?.env).toMatchObject({
      ENHE_ADMIN_VISUAL_FIXTURE: "1",
      ENHE_ADMIN_VISUAL_FIXTURE_HOST: "127.0.0.1",
    });
  });

  it("binds the dedicated admin fixture server to loopback", async () => {
    vi.stubEnv("ADMIN_VISUAL_PORT", "43292");

    const { default: config } = await import("../../playwright.admin-visual.config");

    expect(config.use?.baseURL).toBe("http://127.0.0.1:43292");
    const webServer = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;
    expect(webServer?.command).toContain("--hostname 127.0.0.1");
    expect(webServer?.reuseExistingServer).toBe(false);
    expect(webServer?.env).toMatchObject({
      DATABASE_URL: "",
      DIRECT_URL: "",
      SEO_AUDIT_TEST_DATABASE_URL: "",
      NEXT_TELEMETRY_DISABLED: "1",
      ENHE_ADMIN_VISUAL_FIXTURE_HOST: "127.0.0.1",
    });
  });

  it("binds the shared Playwright fixture server to loopback", async () => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "1");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PLAYWRIGHT_USE_PRODUCTION_SERVER", "0");
    vi.stubEnv("PLAYWRIGHT_BASE_URL", undefined);
    vi.stubEnv("PORT", "43293");

    const { default: config } = await import("../../playwright.config");

    expect(config.use?.baseURL).toBe("http://127.0.0.1:43293");
    const webServer = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;
    expect(webServer?.command).toContain("--hostname 127.0.0.1");
    expect(webServer?.reuseExistingServer).toBe(false);
    expect(webServer?.env).toMatchObject({
      DATABASE_URL: "",
      DIRECT_URL: "",
      SEO_AUDIT_TEST_DATABASE_URL: "",
      NEXT_TELEMETRY_DISABLED: "1",
      ENHE_ADMIN_VISUAL_FIXTURE_HOST: "127.0.0.1",
    });
  });

  it("binds standalone production E2E servers to loopback even when Playwright is started directly", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PLAYWRIGHT_USE_PRODUCTION_SERVER", "1");
    vi.stubEnv("PORT", "43298");
    vi.stubEnv("PLAYWRIGHT_BASE_URL", "http://127.0.0.1:43298");

    const { default: config } = await import("../../playwright.config");
    const webServer = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;

    expect(webServer?.command).toContain("start-production-e2e.cjs");
    expect(webServer?.env?.HOSTNAME).toBe("127.0.0.1");
  });

  it.each(["https://www.enhe-tech.com.cn", "https://example.com"])(
    "rejects non-loopback Playwright targets before running browser checks (%s)",
    async (target) => {
      vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "0");
      vi.stubEnv("DATABASE_URL", "");
      vi.stubEnv("NODE_ENV", "test");
      vi.stubEnv("PLAYWRIGHT_USE_PRODUCTION_SERVER", "0");
      vi.stubEnv("PLAYWRIGHT_BASE_URL", target);

      await expect(import("../../playwright.config")).rejects.toThrow("loopback");
    },
  );

  it.each([
    ["http://127.0.0.1:43297", "43296"],
    ["http://127.0.0.1:43296/admin", "43296"],
    ["http://127.0.0.1:43296/?preview=1", "43296"],
    ["http://localhost:43296", "43296"],
    ["http://[::1]:43296", "43296"],
    ["https://127.0.0.1:43296", "43296"],
  ])("rejects a Playwright URL that does not target the started server (%s)", async (target, port) => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "0");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PLAYWRIGHT_USE_PRODUCTION_SERVER", "0");
    vi.stubEnv("PORT", port);
    vi.stubEnv("PLAYWRIGHT_BASE_URL", target);

    await expect(import("../../playwright.config")).rejects.toThrow("same loopback server");
  });

  it.each(["0", "65536", "9007199254740992", "3000;not-a-command"])(
    "rejects invalid Playwright ports before starting a server (%s)",
    async (port) => {
      vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "0");
      vi.stubEnv("DATABASE_URL", "");
      vi.stubEnv("NODE_ENV", "test");
      vi.stubEnv("PLAYWRIGHT_USE_PRODUCTION_SERVER", "0");
      vi.stubEnv("PLAYWRIGHT_BASE_URL", undefined);
      vi.stubEnv("PORT", port);

      await expect(import("../../playwright.config")).rejects.toThrow(
        "PORT must be an integer between 1 and 65535.",
      );
    },
  );

  it.each(["1", "65535"])("accepts the Playwright port boundary %s", async (port) => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "0");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PLAYWRIGHT_USE_PRODUCTION_SERVER", "0");
    vi.stubEnv("PLAYWRIGHT_BASE_URL", undefined);
    vi.stubEnv("PORT", port);

    const { default: config } = await import("../../playwright.config");

    expect(config.use?.baseURL).toBe(`http://127.0.0.1:${port}`);
  });

  it("accepts the normalized default HTTP port 80", async () => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "0");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PLAYWRIGHT_USE_PRODUCTION_SERVER", "0");
    vi.stubEnv("PORT", "80");
    vi.stubEnv("PLAYWRIGHT_BASE_URL", "http://127.0.0.1");

    const { default: config } = await import("../../playwright.config");

    expect(config.use?.baseURL).toBe("http://127.0.0.1");
  });

  it("rejects a non-loopback database before loading a test configuration", async () => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "0");
    vi.stubEnv("DATABASE_URL", "postgresql://fixture:fixture@db.example.test/enhe_test");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PLAYWRIGHT_USE_PRODUCTION_SERVER", "0");
    vi.stubEnv("PORT", "43294");
    vi.stubEnv("PLAYWRIGHT_BASE_URL", "http://127.0.0.1:43294");

    await expect(import("../../playwright.config")).rejects.toThrow("local PostgreSQL");
  });

  it("allows a loopback PostgreSQL test database in configuration without connecting to it", async () => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "0");
    vi.stubEnv("DATABASE_URL", "postgresql://fixture:fixture@127.0.0.1:5432/enhe_test");
    vi.stubEnv("ENHE_E2E_ALLOW_DATABASE_MUTATION", "1");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PLAYWRIGHT_USE_PRODUCTION_SERVER", "0");
    vi.stubEnv("PORT", "43295");
    vi.stubEnv("PLAYWRIGHT_BASE_URL", "http://127.0.0.1:43295");

    const { default: config } = await import("../../playwright.config");
    const webServer = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;

    expect(config.use?.baseURL).toBe("http://127.0.0.1:43295");
    expect(webServer?.env).toMatchObject({
      DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:5432/enhe_test",
      DIRECT_URL: "postgresql://fixture:fixture@127.0.0.1:5432/enhe_test",
      SEO_AUDIT_TEST_DATABASE_URL: "",
    });
    expect(config.testIgnore).not.toContain("**/public-navigation-search.spec.ts");
    expect(config.testIgnore).not.toContain("**/seo-audit-commercial.spec.ts");
    expect(config.testIgnore).not.toContain("**/commercial-flow.spec.ts");
    expect(config.testIgnore).toEqual(
      expect.arrayContaining([
        "**/ai-news-topics-index.spec.ts",
        "**/auth-shell-dbfree.spec.ts",
        "**/byox-route-navigation.spec.ts",
        "**/public-final-contrast.spec.ts",
      ]),
    );
  });

  it("excludes direct database-writer specs from the database-free default suite", async () => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "0");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("ENHE_E2E_ALLOW_DATABASE_MUTATION", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PLAYWRIGHT_USE_PRODUCTION_SERVER", "0");
    vi.stubEnv("PORT", "43299");
    vi.stubEnv("PLAYWRIGHT_BASE_URL", undefined);

    const { default: config } = await import("../../playwright.config");

    expect(config.testIgnore).toContain("**/public-navigation-search.spec.ts");
    expect(config.testIgnore).toContain("**/seo-audit-commercial.spec.ts");
    expect(config.testIgnore).toContain("**/commercial-flow.spec.ts");
    expect(config.testIgnore).not.toContain("**/ai-news-topics-index.spec.ts");
    expect(config.testIgnore).not.toContain("**/auth-shell-dbfree.spec.ts");
    expect(config.testIgnore).not.toContain("**/byox-route-navigation.spec.ts");
    expect(config.testIgnore).not.toContain("**/public-final-contrast.spec.ts");
  });

  it.each([
    "postgresql://fixture:fixture@127.0.0.1:5432/enhe",
    "postgresql://fixture:fixture@127.0.0.1:5432/enhe_production_test",
  ])("rejects a local database without a safe test/e2e name (%s)", async (databaseUrl) => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "0");
    vi.stubEnv("DATABASE_URL", databaseUrl);
    vi.stubEnv("ENHE_E2E_ALLOW_DATABASE_MUTATION", "1");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PLAYWRIGHT_USE_PRODUCTION_SERVER", "0");
    vi.stubEnv("PORT", "43296");
    vi.stubEnv("PLAYWRIGHT_BASE_URL", "http://127.0.0.1:43296");

    await expect(import("../../playwright.config")).rejects.toThrow("dedicated local PostgreSQL test/e2e database");
  });

  it("requires explicit mutation opt-in for a configured local test database", async () => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "0");
    vi.stubEnv("DATABASE_URL", "postgresql://fixture:fixture@127.0.0.1:5432/enhe_test");
    vi.stubEnv("ENHE_E2E_ALLOW_DATABASE_MUTATION", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PLAYWRIGHT_USE_PRODUCTION_SERVER", "0");
    vi.stubEnv("PORT", "43297");
    vi.stubEnv("PLAYWRIGHT_BASE_URL", "http://127.0.0.1:43297");

    await expect(import("../../playwright.config")).rejects.toThrow("ENHE_E2E_ALLOW_DATABASE_MUTATION=1");
  });

  it("keeps the dedicated empty-tools admin fixture out of the default project", async () => {
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "0");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PLAYWRIGHT_USE_PRODUCTION_SERVER", "0");
    vi.stubEnv("PORT", "43298");
    vi.stubEnv("PLAYWRIGHT_BASE_URL", undefined);

    const { default: config } = await import("../../playwright.config");

    expect(config.testIgnore).toContain("**/admin-empty-tools-guidance.spec.ts");
  });
});
