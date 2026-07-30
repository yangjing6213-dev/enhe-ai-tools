import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/app/software/page-shell.tsx"),
  "utf8",
);

describe("software listing SEO audit entry", () => {
  it("links both locales to the real audit product with its free offer", () => {
    expect(source).toContain('buildLocalePath("/online-tools/seo-geo-audit", forceLocale)');
    expect(source).toContain("独立站 SEO/GEO 智能巡检");
    expect(source).toContain("Independent-site SEO/GEO Audit");
    expect(source).toContain("免费巡检 10 页");
    expect(source).toContain("Audit 10 pages free");
  });
});
