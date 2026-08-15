import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/software/page-shell.tsx"),
  "utf8",
);
const candidateDataSource = readFileSync(
  resolve(process.cwd(), "src/lib/redesign/software/software-products.ts"),
  "utf8",
);

describe("software listing SEO audit entry", () => {
  it("keeps the audit in preview data without hardcoding it into production", () => {
    expect(pageSource).toContain("getProductionSoftwareCatalog");
    expect(pageSource).not.toContain(
      'buildLocalePath("/online-tools/seo-geo-audit", forceLocale)',
    );
    expect(candidateDataSource).toContain("独立站 SEO/GEO 智能巡检");
    expect(candidateDataSource).toContain("Independent-site SEO/GEO Audit");
    expect(candidateDataSource).toContain("免费巡检 10 页");
    expect(candidateDataSource).toContain("Free 10-page audit");
    expect(candidateDataSource).toContain('zh: "/online-tools/seo-geo-audit"');
    expect(candidateDataSource).toContain('en: "/en/online-tools/seo-geo-audit"');
  });
});
