import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src");

function readSource(relativePath: string) {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("ENHE Phase 2C.1 production wiring", () => {
  it("uses the approved redesign shell for every public page", () => {
    const chrome = readSource("components/public-site-chrome.tsx");
    const adapter = readSource("components/redesign/enhe-production-public-shell.tsx");

    expect(chrome).toContain("EnheRedesignPublicHeader");
    expect(chrome).toContain("EnheRedesignPublicFooter");
    expect(adapter).toContain("EnheRedesignHeader");
    expect(adapter).toContain("EnheRedesignFooter");
    expect(chrome).not.toContain("<SiteHeader");
    expect(chrome).not.toContain("<SiteFooter");
  });

  it("replaces only the Chinese and English production home bodies", () => {
    const zhHome = readSource("app/(zh-public)/page.tsx");
    const enHome = readSource("app/en/page.tsx");

    expect(zhHome).toContain("EnheRedesignHome");
    expect(zhHome).toContain('locale="zh"');
    expect(enHome).toContain("EnheRedesignHome");
    expect(enHome).toContain('locale="en"');
    expect(zhHome).not.toContain("HomePageShell");
    expect(enHome).not.toContain("HomePageShell");
  });

  it("keeps the locked homepage CTA and one-H1 source contract", () => {
    const homeCopy = readSource("lib/redesign/home/home-copy.ts");
    const home = readSource("components/redesign/home/EnheRedesignHome.tsx");

    expect(homeCopy).toContain('href: "/software"');
    expect(homeCopy).toContain('href: "/en/software"');
    expect(home).toContain("<EnheRedesignHero");
    expect(home).toContain("<EnheRedesignProductShowcase");
    expect(home).toContain("<EnheRedesignExperienceReviews");
    expect(home).toContain("<EnheRedesignBrandValue");
  });

  it("exposes exactly two AI Skill dropdown destinations", () => {
    const navigation = readSource("components/redesign/navigation.ts");
    const header = readSource("components/redesign/enhe-redesign-header.tsx");
    const menu = readSource("components/redesign/enhe-redesign-mobile-menu.tsx");

    expect(navigation).toContain("children:");
    expect(navigation).toContain("ai-prompt-management");
    expect(navigation).toContain('href: "/ai-skills"');
    expect(header).toContain("item.children");
    expect(menu).toContain("item.children");
    expect(navigation.match(/ai-prompt-management/g)?.length).toBe(2);
  });

  it("uses the verified server session snapshot for the admin boundary", () => {
    const chrome = readSource("components/redesign/enhe-production-public-shell.tsx");
    const auth = readSource("lib/auth.ts");

    expect(chrome).toContain("getHeaderUserSnapshot");
    expect(chrome).toContain("isAdmin");
    expect(auth).toContain("verifyHeaderUserCookieValue");
    expect(chrome).not.toMatch(/localStorage|sessionStorage|searchParams|query/);
  });

  it("passes the actual public pathname to the locale switch", () => {
    const middleware = readSource("middleware.ts");
    const adapter = readSource("components/redesign/enhe-production-public-shell.tsx");

    expect(middleware).toContain('requestHeaders.set("x-enhe-pathname", pathname)');
    expect(adapter).toContain('requestHeaders.get("x-enhe-pathname")');
    expect(adapter).toContain("buildLanguageSwitcherHref");
  });

  it("removes legacy visual effects only from public root documents", () => {
    const rootLayout = readSource("app/root-layout-shared.tsx");
    const zhLayout = readSource("app/(zh-public)/layout.tsx");
    const enLayout = readSource("app/en/layout.tsx");
    const adminLayout = readSource("app/admin/layout.tsx");

    expect(rootLayout).toContain("disableLegacyVisualEffects");
    expect(rootLayout).toContain("AnalyticsTracker");
    expect(zhLayout).toContain("disableLegacyVisualEffects");
    expect(enLayout).toContain("disableLegacyVisualEffects");
    expect(enLayout).toContain("isEnglishPublicPath");
    expect(enLayout).toContain('pathname.startsWith("/en/user")');
    expect(enLayout).toContain('pathname.startsWith("/en/login")');
    expect(enLayout).toContain('pathname.startsWith("/en/register")');
    expect(adminLayout).not.toContain("disableLegacyVisualEffects");
  });

  it("keeps private and API surfaces on their existing boundaries", () => {
    const auth = readSource("app/(auth)/layout.tsx");
    const enAuth = readSource("app/en/(auth)/layout.tsx");
    const user = readSource("app/user/layout.tsx");
    const admin = readSource("app/admin/layout.tsx");
    const orders = readSource("app/orders/layout.tsx");

    for (const layout of [auth, enAuth, user, admin, orders]) {
      expect(layout).toContain("SiteHeader");
      expect(layout).toContain("SiteFooter");
    }
  });

  it("does not move preview-only markers into production call sites", () => {
    for (const path of [
      "components/public-site-chrome.tsx",
      "app/(zh-public)/page.tsx",
      "app/en/page.tsx",
    ]) {
      const source = readSource(path);
      expect(source).not.toMatch(/LOCAL CANDIDATE|Preview|Candidate|Phase 2A|Phase 2B/i);
    }
  });
});
