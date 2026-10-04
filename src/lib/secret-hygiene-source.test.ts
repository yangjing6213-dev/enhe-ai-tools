import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function readRootIfPresent(path: string) {
  const url = new URL(`../../${path}`, import.meta.url);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

describe("local secret hygiene", () => {
  it("keeps provider and signing fixtures out of source as secret-shaped values", () => {
    const indexNow = readSource("lib/indexnow.ts");
    const zpay = readSource("lib/zpay.test.ts");
    const zpayOrders = readSource("lib/zpay-orders.test.ts");
    const postgresZpay = [
      readSource("lib/admin-order-mutations.postgres.test.ts"),
      readSource("lib/zpay-seo-audit.postgres.test.ts"),
      readSource("lib/zpay-orders.postgres.test.ts")
    ].join("\n");
    const license = readSource("lib/license-generator.test.ts");

    expect(indexNow).not.toMatch(/defaultIndexNowKey\s*=\s*["'`][A-Za-z0-9-]{32,}/);
    expect(zpay).not.toMatch(/test_secret_[A-Za-z0-9_]{16,}/);
    expect(zpay).not.toMatch(/from-(?:file|env)-key-[A-Za-z0-9]{12,}/);
    expect(zpayOrders).not.toMatch(/test_secret_[A-Za-z0-9_]{16,}/);
    expect(postgresZpay).not.toMatch(/test_secret_[A-Za-z0-9_]{16,}/);
    expect(license).not.toContain("BEGIN " + "PRIVATE KEY");
  });

  it("keeps the scanner exception limited to the confirmed route-fingerprint finding", () => {
    const entries = readRootIfPresent(".gitleaksignore")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    expect(entries).toEqual([
      "docs/enhe-redesign/phase-1b1/04-PRODUCTION-ROUTE-FINGERPRINT.md:generic-api-key:7"
    ]);
  });
});
