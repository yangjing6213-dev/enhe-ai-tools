import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import RedesignHomePreviewPage from "@/app/redesign-preview/home/page";
import { resolveRedesignPreviewLocale } from "@/lib/redesign/home/home-preview-locale";

const { requestHeaders } = vi.hoisted(() => ({
  requestHeaders: new Headers(),
}));

vi.mock("next/headers", () => ({
  headers: async () => requestHeaders,
}));

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const root = join(process.cwd(), "src");

function readCandidate(relativePath: string) {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("bilingual homepage candidate preview", () => {
  it("lets a valid query override the middleware header in both directions", async () => {
    requestHeaders.set("x-enhe-locale", "zh");
    const english = (await RedesignHomePreviewPage({
      searchParams: Promise.resolve({ locale: "en" }),
    })) as { props: { lang: string } };

    requestHeaders.set("x-enhe-locale", "en");
    const chinese = (await RedesignHomePreviewPage({
      searchParams: Promise.resolve({ locale: "zh" }),
    })) as { props: { lang: string } };

    expect(english.props.lang).toBe("en");
    expect(chinese.props.lang).toBe("zh");
  });

  it("matches URLSearchParams.get for duplicate locale values", async () => {
    requestHeaders.set("x-enhe-locale", "zh");
    expect(resolveRedesignPreviewLocale({ locale: ["en", "fr"] }, "zh")).toBe("en");
    expect(resolveRedesignPreviewLocale({ locale: ["zh", "en"] }, "en")).toBe("zh");
    expect(resolveRedesignPreviewLocale({ locale: ["fr", "en"] }, "en")).toBe("zh");

    const rendered = (await RedesignHomePreviewPage({
      searchParams: Promise.resolve({ locale: ["en", "fr"] }),
    })) as { props: { lang: string } };

    expect(rendered.props.lang).toBe("en");
  });

  it("keeps the middleware-normalized locale after the query redirect", async () => {
    requestHeaders.set("x-enhe-locale", "en");

    const rendered = (await RedesignHomePreviewPage({
      searchParams: Promise.resolve({}),
    })) as {
      props: {
        lang: string;
        children: Array<{ props: { locale?: string } }>;
      };
    };

    expect(rendered.props.lang).toBe("en");
    expect(rendered.props.children[0]?.props.locale).toBe("en");
    expect(rendered.props.children[2]?.props.locale).toBe("en");
    expect(rendered.props.children[3]?.props.locale).toBe("en");
  });

  it("falls back to Chinese for invalid query and invalid middleware locale", async () => {
    requestHeaders.set("x-enhe-locale", "fr");

    const rendered = (await RedesignHomePreviewPage({
      searchParams: Promise.resolve({ locale: "fr" }),
    })) as { props: { lang: string } };

    expect(rendered.props.lang).toBe("zh");
  });

  it("uses the public home route and removes the old private home folder", () => {
    expect(existsSync(join(root, "app/__redesign-preview/home/page.tsx"))).toBe(false);
    expect(existsSync(join(root, "app/__redesign-preview/home/layout.tsx"))).toBe(false);
    expect(existsSync(join(root, "app/redesign-preview/home/page.tsx"))).toBe(true);
    expect(existsSync(join(root, "app/redesign-preview/home/layout.tsx"))).toBe(true);
  });

  it("guards the route and excludes it from indexing without a production canonical", () => {
    const page = readCandidate("app/redesign-preview/home/page.tsx");
    const layout = readCandidate("app/redesign-preview/home/layout.tsx");
    const locale = readCandidate("lib/redesign/home/home-preview-locale.ts");

    expect(page).toMatch(/searchParams\s*:\s*Promise<\{\s*locale\?:\s*string\s*\|\s*string\[\]\s*\}>/);
    expect(page).toContain("await searchParams");
    expect(page).toContain("notFound");
    expect(page).toContain('process.env.NODE_ENV === "production"');
    expect(page).toContain("languageHrefs[locale]");
    expect(locale).toContain('requestedLocale === "zh"');
    expect(locale).toContain(': "zh"');
    expect(layout).toContain('import "@/styles/redesign/tokens.css"');
    expect(layout).toContain('import "@/styles/redesign/shell.css"');
    expect(layout).toContain('import "@/styles/redesign/home.css"');
    expect(layout).toContain("index: false");
    expect(layout).toContain("follow: false");
    expect(layout).toContain("noarchive: true");
    expect(layout).toContain("noimageindex: true");
    expect(layout).not.toMatch(/canonical|alternates/i);
  });

  it("provides a standalone document wrapper for the guarded preview route", () => {
    const layout = readCandidate("app/redesign-preview/home/layout.tsx");

    expect(layout).toContain("<html");
    expect(layout).toContain("<body>");
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
    expect(page).toContain("REDESIGN_NAV_ITEMS[locale]");
    expect(page).toContain("REDESIGN_PREVIEW_FILING[locale]");
    expect(page).toContain("languageHrefs={languageHrefs}");
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
