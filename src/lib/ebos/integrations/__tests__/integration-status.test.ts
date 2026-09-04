import { describe, expect, test } from "vitest";
import { checkEbosIntegrationReadiness } from "../integration-status";

describe("checkEbosIntegrationReadiness", () => {
  test("marks configured integrations when all required env keys exist", () => {
    const report = checkEbosIntegrationReadiness({
      DATABASE_URL: "postgres://secret",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "secret@example.com",
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "private key",
      GOOGLE_SEARCH_CONSOLE_SITE_URL: "https://example.com",
      GA_PROPERTY_ID: "123"
    });

    expect(report.checks.find((item) => item.key === "google_search_console")?.status).toBe("configured");
    expect(report.checks.find((item) => item.key === "google_analytics")?.status).toBe("configured");
    expect(report.checks.find((item) => item.key === "internal_database")?.status).toBe("configured");
    expect(JSON.stringify(report)).not.toContain("private key");
    expect(JSON.stringify(report)).not.toContain("postgres://secret");
  });

  test("marks missing integrations as missing_config and creates setup actions", () => {
    const report = checkEbosIntegrationReadiness({});
    const gsc = report.checks.find((item) => item.key === "google_search_console");

    expect(gsc?.status).toBe("missing_config");
    expect(gsc?.missingEnvKeys).toContain("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    expect(gsc?.actionItems.length).toBeGreaterThan(0);
  });

  test("manual input is always configured", () => {
    const report = checkEbosIntegrationReadiness({});

    expect(report.checks.find((item) => item.key === "manual_input")?.status).toBe("configured");
  });
});
