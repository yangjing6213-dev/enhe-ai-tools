import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SiteFooter } from "@/components/site-footer";
import { PRODUCTION_FILING } from "@/lib/production-filing";
import { EnheRedesignFooter } from "./enhe-redesign-footer";
import { EnheRedesignLanguageSwitch } from "./enhe-redesign-language-switch";
import {
  REDESIGN_EN_NAV_ITEMS,
  REDESIGN_NAV_ITEMS,
  REDESIGN_ZH_NAV_ITEMS,
} from "./navigation";

vi.mock("@/lib/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/settings")>();

  return { ...actual, getSettingsMap: async () => ({}) };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ prefetch: vi.fn() }),
}));

const sourceRoot = join(process.cwd(), "src");

Object.assign(globalThis, { React });

function readSource(relativePath: string) {
  try {
    return readFileSync(join(sourceRoot, relativePath), "utf8");
  } catch {
    return "";
  }
}

function visibleText(html: string) {
  return html.replace(/<[^>]+>/g, "").replace(/\s/g, "");
}

describe("ENHE Phase 2C.1.2 production copy compliance", () => {
  it("uses the exact Chinese and English main navigation labels in order", () => {
    expect(REDESIGN_ZH_NAV_ITEMS.map(({ label }) => label)).toEqual([
      "AI工具",
      "AI Skill",
      "AI资讯",
      "AI趋势",
      "关于我们",
      "搜索",
    ]);
    expect(REDESIGN_EN_NAV_ITEMS.map(({ label }) => label)).toEqual([
      "AI Tools",
      "AI Skills",
      "AI News",
      "AI Trends",
      "About",
      "Search",
    ]);
  });

  it("uses the exact localized AI Skills dropdown labels", () => {
    expect(REDESIGN_ZH_NAV_ITEMS[1].children?.map(({ label }) => label)).toEqual([
      "AI 提示词",
      "AI Skill",
    ]);
    expect(REDESIGN_EN_NAV_ITEMS[1].children?.map(({ label }) => label)).toEqual([
      "AI Prompts",
      "AI Skills",
    ]);
  });

  it.each(["zh", "en"] as const)(
    "renders the %s language switch as Chinese then English with one current locale",
    (currentLocale) => {
      const html = renderToStaticMarkup(
        React.createElement(EnheRedesignLanguageSwitch, {
          currentLocale,
          localeHrefs: { zh: "/about", en: "/en/about" },
          ariaLabel: "中文 / EN",
        }),
      );

      expect(visibleText(html)).toBe("中文/EN");
      expect(html.indexOf('href="/about"')).toBeLessThan(html.indexOf('href="/en/about"'));
      expect(html.match(/aria-current="page"/g)).toHaveLength(1);
      expect(html).toMatch(
        currentLocale === "zh"
          ? /href="\/about"[^>]*aria-current="page"/
          : /href="\/en\/about"[^>]*aria-current="page"/,
      );
    },
  );

  it("omits the filing element entirely when no filing data exists", () => {
    const withoutFiling = renderToStaticMarkup(React.createElement(EnheRedesignFooter, { locale: "en" }));
    const emptyFilingProps = { locale: "en", filing: {} } as const;
    const withEmptyFiling = renderToStaticMarkup(
      React.createElement(EnheRedesignFooter, emptyFilingProps),
    );

    for (const html of [withoutFiling, withEmptyFiling]) {
      const footerBottom = html.slice(html.indexOf('<div class="footer-bottom">'));
      expect(footerBottom.match(/<p>/g)).toHaveLength(1);
      expect(html).not.toContain("ICP filing · Public-security filing");
      expect(html).not.toContain("ICP备案 · 公安备案");
    }
  });

  it.each(["zh", "en"] as const)(
    "renders the tracked %s filing labels and trusted links without generic substitutes",
    (locale) => {
      const filing = PRODUCTION_FILING[locale];
      const html = renderToStaticMarkup(
        React.createElement(EnheRedesignFooter, { locale, filing }),
      );

      expect(html).toContain(filing.icp.label);
      expect(html).toContain(filing.publicSecurity.label);
      expect(html).toContain(`href="${filing.icp.href}"`);
      expect(html).toContain(`href="${filing.publicSecurity.href}"`);
      expect(html).not.toContain("ICP filing · Public-security filing");
      expect(html).not.toContain("ICP备案 · 公安备案");
    },
  );

  it.each(["zh", "en"] as const)(
    "keeps the legacy %s footer output on the shared tracked filing values",
    async (locale) => {
      const filing = PRODUCTION_FILING[locale];
      const html = renderToStaticMarkup(await SiteFooter({ forceLocale: locale }));

      expect(html).toContain(filing.icp.label);
      expect(html).toContain(filing.publicSecurity.label);
      expect(html).toContain(`href="${filing.icp.href}"`);
      expect(html).toContain(`href="${filing.publicSecurity.href}"`);
    },
  );

  it("keeps one typed navigation source and separates production filing data from preview specimen data", () => {
    const navigation = readSource("components/redesign/navigation.ts");
    const header = readSource("components/redesign/enhe-redesign-header.tsx");
    const adapter = readSource("components/redesign/enhe-production-public-shell.tsx");
    const productionFiling = readSource("lib/production-filing.ts");
    const previewFiling = readSource("components/redesign/preview-filing.ts");

    expect(REDESIGN_ZH_NAV_ITEMS).toBe(REDESIGN_NAV_ITEMS.zh);
    expect(REDESIGN_EN_NAV_ITEMS).toBe(REDESIGN_NAV_ITEMS.en);
    expect(navigation).toContain("REDESIGN_NAV_ITEMS");
    expect(navigation).toContain("satisfies Record<RedesignLocale");
    expect(header).toContain("{navItems.map");
    expect(header).toContain("navItems={navItems}");
    expect(adapter).toContain("REDESIGN_NAV_ITEMS[redesignLocale]");
    expect(adapter).toContain("PRODUCTION_FILING[redesignLocale]");
    expect(adapter).not.toContain("REDESIGN_PREVIEW_FILING");
    expect(productionFiling).toContain("闽ICP备2025092404号-2");
    expect(productionFiling).toContain("Fujian Public Security Record No. 35030302900035");
    expect(previewFiling).toContain("ICP备案");
    expect(previewFiling).toContain("ICP filing");
  });
});
