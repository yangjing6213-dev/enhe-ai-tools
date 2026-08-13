import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src");

function readCandidate(relativePath: string) {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("bilingual homepage candidate preview", () => {
  it("uses the public home route and removes the old private home folder", () => {
    expect(existsSync(join(root, "app/__redesign-preview/home/page.tsx"))).toBe(false);
    expect(existsSync(join(root, "app/__redesign-preview/home/layout.tsx"))).toBe(false);
    expect(existsSync(join(root, "app/redesign-preview/home/page.tsx"))).toBe(true);
    expect(existsSync(join(root, "app/redesign-preview/home/layout.tsx"))).toBe(true);
  });

  it("guards the route and excludes it from indexing without a production canonical", () => {
    const page = readCandidate("app/redesign-preview/home/page.tsx");
    const layout = readCandidate("app/redesign-preview/home/layout.tsx");

    expect(page).toMatch(/searchParams\s*:\s*Promise<\{\s*locale\?:\s*string\s*\|\s*string\[\]\s*\}>/);
    expect(page).toContain("await searchParams");
    expect(page).toContain("notFound");
    expect(page).toContain('process.env.NODE_ENV === "production"');
    expect(page).toContain('locale === "en"');
    expect(page).toContain('requestedLocale === "zh"');
    expect(page).toContain(': "zh"');
    expect(layout).toContain('import "@/styles/redesign/tokens.css"');
    expect(layout).toContain('import "@/styles/redesign/shell.css"');
    expect(layout).toContain('import "@/styles/redesign/home.css"');
    expect(layout).toContain("index: false");
    expect(layout).toContain("follow: false");
    expect(layout).toContain("noarchive: true");
    expect(layout).toContain("noimageindex: true");
    expect(layout).not.toMatch(/canonical|alternates/i);
  });

  it("propagates one resolved locale through header, home, footer, and root lang", () => {
    const page = readCandidate("app/redesign-preview/home/page.tsx");
    const home = readCandidate("components/redesign/home/EnheRedesignHome.tsx");
    const brandValue = readCandidate("components/redesign/home/EnheRedesignBrandValue.tsx");

    expect(page).toContain("EnheRedesignHeader");
    expect(page).toContain("EnheRedesignHome");
    expect(page).toContain("EnheRedesignFooter");
    expect(page.match(/locale=\{locale\}/g)).toHaveLength(3);
    expect(page).toContain("lang={locale}");
    expect(page).toContain('REDESIGN_ZH_NAV_ITEMS');
    expect(page).toContain('REDESIGN_EN_NAV_ITEMS');
    expect(page).toContain('alternateHref');
    expect(page).toContain('/redesign-preview/home?locale=en');
    expect(page).toContain('/redesign-preview/home?locale=zh');
    const render = home.slice(home.indexOf("return ("));
    expect(render.indexOf("<EnheRedesignHero")).toBeLessThan(render.indexOf("<EnheRedesignProductShowcase"));
    expect(render.indexOf("<EnheRedesignProductShowcase")).toBeLessThan(render.indexOf("<EnheRedesignExperienceReviews"));
    expect(render.indexOf("<EnheRedesignExperienceReviews")).toBeLessThan(render.indexOf("<EnheRedesignBrandValue"));
    expect(render).toContain("<EnheRedesignHero locale={locale} />");
    expect(render).toContain("<EnheRedesignProductShowcase locale={locale} />");
    expect(render).toContain("<EnheRedesignExperienceReviews locale={locale} />");
    expect(render).toContain("<EnheRedesignBrandValue locale={locale} />");
    expect(home).not.toContain("LOCAL CANDIDATE");
    expect(brandValue).toContain("HOME_COPY");
    expect(brandValue).toContain("HOME_COPY[locale]");
  });

  it("keeps the candidate out of production navigation and forbidden data paths", () => {
    const page = readCandidate("app/redesign-preview/home/page.tsx");
    const home = readCandidate("components/redesign/home/EnheRedesignHome.tsx");
    const brandValue = readCandidate("components/redesign/home/EnheRedesignBrandValue.tsx");
    const sitemap = readCandidate("app/sitemap.ts");
    const navigation = readCandidate("components/redesign/navigation.ts");
    const forbidden = /File\.file(?:Url|Path)|orders|payment|download|OAuth|prisma|database|fetch\(|\/api\/|secret/i;

    expect(sitemap).not.toContain("redesign-preview");
    expect(navigation).not.toContain("redesign-preview");
    for (const source of [page, home, brandValue]) {
      expect(source).not.toMatch(forbidden);
    }
  });

  it("keeps exactly one homepage H1 and no mixed locale literals in the composition", () => {
    const page = readCandidate("app/redesign-preview/home/page.tsx");
    const hero = readCandidate("components/redesign/home/EnheRedesignHero.tsx");
    const home = readCandidate("components/redesign/home/EnheRedesignHome.tsx");
    const brandValue = readCandidate("components/redesign/home/EnheRedesignBrandValue.tsx");

    expect((hero.match(/<h1\b/g) ?? []).length).toBe(1);
    expect((home.match(/<h1\b/g) ?? []).length).toBe(0);
    expect((brandValue.match(/<h1\b/g) ?? []).length).toBe(0);
    expect(page).not.toMatch(/locale="(?:zh|en)"/);
    expect(home).not.toMatch(/locale="(?:zh|en)"/);
    expect(brandValue).not.toMatch(/locale="(?:zh|en)"/);
  });
});
