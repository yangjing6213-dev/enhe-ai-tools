import { describe, expect, test } from "vitest";
import { createCommandHealthResult } from "../command-health";
import { createSmokeCheckResult } from "../smoke-checks";
import { calculateWebsiteHealthScore } from "../website-health-score";
import type { EbosWebsiteHealthSnapshot } from "../health-types";

function snapshot(commands: EbosWebsiteHealthSnapshot["commands"]): EbosWebsiteHealthSnapshot {
  return {
    generatedAt: new Date("2026-07-02T12:00:00+08:00"),
    commands
  };
}

describe("calculateWebsiteHealthScore", () => {
  test("caps the score at 60 when build fails", () => {
    const result = calculateWebsiteHealthScore(snapshot([
      createCommandHealthResult({ key: "lint", command: "npm run lint", exitCode: 0 }),
      createCommandHealthResult({ key: "typecheck", command: "npm run typecheck", exitCode: 0 }),
      createCommandHealthResult({ key: "build", command: "npm run build", exitCode: 1, stderr: "build failed" }),
      createCommandHealthResult({ key: "ebos_tests", command: "npm run test -- src/lib/ebos", exitCode: 0 }),
      createCommandHealthResult({ key: "unit_tests", command: "npm test", exitCode: 0 }),
      createCommandHealthResult({ key: "playwright_smoke", command: "npm run test:e2e", exitCode: 0 }),
      createCommandHealthResult({ key: "lighthouse", command: "lighthouse", exitCode: 0 })
    ]));

    expect(result.score).toBeLessThanOrEqual(60);
    expect(result.risks.some((risk) => risk.message.includes("build"))).toBe(true);
  });

  test("lowers confidence when checks are skipped", () => {
    const result = calculateWebsiteHealthScore(snapshot([
      createCommandHealthResult({ key: "lint", command: "npm run lint", exitCode: 0 }),
      createCommandHealthResult({ key: "typecheck", command: "npm run typecheck", exitCode: 0 }),
      createCommandHealthResult({ key: "build", command: "npm run build", exitCode: 0 }),
      createCommandHealthResult({ key: "ebos_tests", command: "npm run test -- src/lib/ebos", exitCode: 0 }),
      createCommandHealthResult({ key: "unit_tests", command: "npm test", skipped: true }),
      createCommandHealthResult({ key: "playwright_smoke", command: "npm run test:e2e", skipped: true })
    ]));

    expect(result.confidence).toBe("partial");
    expect(result.recommendations.some((item) => item.message.includes("skipped"))).toBe(true);
  });

  test("treats sitemap sourced product page 404 as a revenue path risk", () => {
    const result = calculateWebsiteHealthScore(snapshot([
      createSmokeCheckResult({
        key: "key_product_pages",
        label: "Key Product Page product-a",
        url: "https://example.com/software/product-a",
        status: "failed",
        httpStatus: 404,
        source: "sitemap",
        sourceConfidence: "complete",
        environmentMismatchRisk: false,
        isProductDetailPage: true,
        reason: "Discovered in the checked site's sitemap.xml."
      })
    ]));

    expect(result.risks).toContainEqual(expect.objectContaining({
      severity: "critical",
      message: expect.stringContaining("Revenue path risk")
    }));
    expect(result.risks.some((risk) => risk.message.includes("sitemap-sourced"))).toBe(true);
  });

  test("does not classify environment mismatch database 404 as the highest revenue risk", () => {
    const result = calculateWebsiteHealthScore(snapshot([
      createSmokeCheckResult({
        key: "key_product_pages",
        label: "Key Product Page local-only",
        url: "https://www.enhe-tech.com.cn/software/local-only",
        status: "failed",
        httpStatus: 404,
        source: "internal_database",
        sourceConfidence: "partial",
        environmentMismatchRisk: true,
        isProductDetailPage: true,
        reason: "URL source may not match checked environment."
      })
    ]));

    expect(result.risks.some((risk) => risk.severity === "critical" && risk.message.includes("Revenue path risk"))).toBe(false);
    expect(result.risks).toContainEqual(expect.objectContaining({
      severity: "warning",
      message: expect.stringContaining("URL source may not match checked environment")
    }));
  });

  test("gives partial credit and a warning when only software listing fallback passed", () => {
    const result = calculateWebsiteHealthScore(snapshot([
      createSmokeCheckResult({
        key: "key_product_pages",
        label: "Key Product Page software listing page",
        url: "https://example.com/software",
        status: "passed",
        httpStatus: 200,
        source: "manual_fallback",
        sourceConfidence: "partial",
        isProductDetailPage: false,
        reason: "Manual fallback only confirms the software listing page."
      })
    ]));

    expect(result.score).toBeGreaterThan(0);
    expect(result.risks).toContainEqual(expect.objectContaining({
      severity: "warning",
      message: expect.stringContaining("Product detail page accessibility was not confirmed")
    }));
  });
});
