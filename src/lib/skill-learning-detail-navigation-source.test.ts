import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("catalog detail navigation", () => {
  it("uses the shared localized breadcrumb without a duplicate catalog link", () => {
    const page = readFileSync(resolve(root, "src/app/tools/[slug]/page-shell.tsx"), "utf8");

    expect(page).not.toContain('<ButtonLink href={baseListingPath} variant="ghost">');
    const chrome = readFileSync(resolve(root, "src/components/redesign/enhe-production-public-shell.tsx"), "utf8");
    const breadcrumb = readFileSync(resolve(root, "src/components/site-breadcrumbs.tsx"), "utf8");
    expect(chrome).toContain('<SiteBreadcrumbs locale={toRedesignLocale(locale)} />');
    expect(breadcrumb).toContain('locale === "en" ? "Breadcrumb" : "面包屑导航"');
  });
});
