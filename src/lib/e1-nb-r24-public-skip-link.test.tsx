import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

vi.mock("@/components/structured-data", () => ({
  StructuredData: () => React.createElement("script", { type: "application/ld+json" }),
}));

vi.mock("@/components/customer-support-widget", () => ({
  CustomerSupportWidget: () => React.createElement("aside", { "data-support": true }),
}));

vi.mock("@/components/redesign/enhe-production-public-shell", () => ({
  EnheRedesignPublicHeader: () => React.createElement("header"),
  EnheRedesignPublicFooter: () => React.createElement("footer"),
}));

vi.mock("@/lib/customer-support", () => ({
  getCustomerSupportFaqs: () => [],
}));

vi.mock("@/lib/brand-entity", () => ({
  buildEnheOrganizationSchema: () => ({}),
}));

vi.mock("@/lib/dictionaries", () => ({
  getDictionary: () => ({ home: { intro: "ENHE" } }),
}));

vi.mock("@/lib/seo", () => ({
  absoluteUrl: (path: string) => `https://example.test${path}`,
  buildLanguageAlternates: () => ({ "x-default": "https://example.test/" }),
  buildLocalePath: (path: string) => path,
  buildWebsiteSchema: () => ({}),
  siteName: "ENHE AI",
}));

vi.mock("@/lib/settings", () => ({
  getEffectiveLocalizedHomeHeroIntro: () => "ENHE",
  getEffectiveSiteLogo: () => "/logo.png",
  getSettingsMap: async () => ({}),
}));

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("E1-NB-R24 public skip-to-content navigation", () => {
  it.each([
    ["zh", "跳到主要内容"],
    ["en", "Skip to main content"],
  ] as const)("renders the %s skip link before the public header", async (locale, label) => {
    const { PublicSiteChrome } = await import("@/components/public-site-chrome");
    const html = renderToStaticMarkup(
      await PublicSiteChrome({
        forceLocale: locale,
        children: React.createElement("main", null, React.createElement("h1", null, "Page")),
      }),
    );

    expect(html).toContain(`href="#main-content"`);
    expect(html).toContain(`>${label}</a>`);
    expect(html).toContain('id="main-content"');
    expect(html).toContain('tabindex="-1"');
    expect(html.match(/<main/g)).toHaveLength(1);
    expect(html.indexOf("redesign-skip-link")).toBeLessThan(html.indexOf("<header"));
    expect(html.indexOf("<header")).toBeLessThan(html.indexOf('id="main-content"'));
    expect(html.indexOf('id="main-content"')).toBeLessThan(html.indexOf("data-support"));
    expect(html.indexOf("data-support")).toBeLessThan(html.indexOf("<footer"));
  });

  it("keeps the link hidden until keyboard focus makes it visible", () => {
    const css = read("src/styles/redesign/shell.css");

    expect(css).toContain(".redesign-skip-link {");
    expect(css).toContain("clip-path: inset(50%);");
    expect(css).toContain(".redesign-skip-link:focus-visible {");
    expect(css).toContain("clip-path: none;");
    expect(css).toContain("z-index: var(--enhe-z-focus);");
  });
});
