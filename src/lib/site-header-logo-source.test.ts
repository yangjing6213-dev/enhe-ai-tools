import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("site header brand source", () => {
  it("uses the approved night logo asset, locale-aware homepage links, and keeps language controls after user center", () => {
    const component = readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8");
    const mobileNav = readFileSync(new URL("../components/mobile-nav-menu.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(component).toContain("/images/brand/enhe-icon-gradient-transparent-cropped.png");
    expect(component).toContain('href={buildLocalePath("/", locale)}');
    expect(component).toContain("site-brand-logo-dark");
    expect(component).not.toContain("/images/brand/enhe-icon-gradient-white-bg-cropped.png");
    expect(component).not.toContain("site-brand-logo-light");
    expect(component).toContain("{t.nav.user}");
    expect(component.indexOf("site-user-center-cta")).toBeLessThan(component.indexOf("<LanguageSwitcher"));
    expect(component).not.toContain("FlatEnheLogoSvg");
    expect(component).not.toContain('href="/register"');

    expect(mobileNav).toContain("mobile-nav-panel");
    expect(mobileNav).toContain("userCenterItem");
    expect(mobileNav).toContain("loginItem");

    expect(css).toContain("width: 46px");
    expect(css).toContain("height: 30px");
    expect(css).toContain(".site-brand-logo-dark");
    expect(css).not.toContain(".site-brand-logo-light");
    expect(css).toContain("color-scheme: dark");
  });
});
