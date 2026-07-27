import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("ENHE AI Organization source contracts", () => {
  it("defines one canonical brand entity helper with verified external identity", () => {
    const helperPath = "src/lib/brand-entity.ts";

    expect(existsSync(join(root, helperPath))).toBe(true);
    if (!existsSync(join(root, helperPath))) return;

    const helper = read(helperPath);

    expect(helper).toContain('absoluteUrl("/#organization")');
    expect(helper).toContain("name: siteName");
    expect(helper).toContain("buildOrganizationSchema");
    expect(helper).toContain("sameAs");
    expect(helper).toContain("https://github.com/hqwzhu/enhe-ai-tools");
    expect(helper).not.toContain('sameAs: [absoluteUrl(');
  });

  it("uses the canonical entity or its id reference on public schema surfaces", () => {
    const publicChrome = read("src/components/public-site-chrome.tsx");
    const home = read("src/app/page-shell.tsx");
    const accountServices = read("src/app/account-services/page-shell.tsx");
    const article = read("src/app/ai-news/[slug]/page-shell.tsx");
    const about = read("src/app/about/page-shell.tsx");
    const toolDetail = read("src/app/tools/[slug]/page-shell.tsx");
    const pricing = read("src/app/pricing/page-shell.tsx");
    const productDemos = read("src/lib/product-demos.ts");

    expect(publicChrome).toContain("buildEnheOrganizationSchema");
    expect(publicChrome).not.toContain("buildOrganizationSchema");

    expect(home).toContain("mainEntity: enheOrganizationReference");
    expect(home).not.toContain('"@type": "Organization"');

    expect(accountServices).toContain("provider: enheOrganizationReference");
    expect(accountServices).not.toContain('"@type": "Organization"');

    expect(article).toContain("publisher: enheOrganizationReference");
    expect(article).not.toContain("buildOrganizationSchema");
    expect(article).not.toContain("const organizationSchema =");

    expect(about).toContain("...buildEnheOrganizationSchema({");
    expect(about).toContain("about: enheOrganizationReference");
    expect(about).toContain("mainEntity: enheOrganizationReference");
    expect(about).not.toContain("buildOrganizationSchema");

    expect(toolDetail).toContain("provider: enheOrganizationReference");
    expect(pricing).toContain("provider: enheOrganizationReference");
    expect(pricing).not.toContain('provider: {\n      "@type": "Organization"');
    expect(productDemos).toContain("publisher: enheOrganizationReference");
    expect(productDemos).not.toContain('publisher: {\n      "@type": "Organization"');
  });
});
