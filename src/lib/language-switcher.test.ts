import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildLanguageSwitcherHref, buildLocalePath } from "@/lib/seo";

describe("buildLanguageSwitcherHref", () => {
  it("keeps localized public routes on the matching page", () => {
    expect(buildLanguageSwitcherHref("/", "en")).toBe("/en");
    expect(buildLanguageSwitcherHref("/en", "zh")).toBe("/");
    expect(buildLanguageSwitcherHref("/software", "en")).toBe("/en/software");
    expect(buildLanguageSwitcherHref("/en/software", "zh")).toBe("/software");
    expect(buildLanguageSwitcherHref("/software/demo-tool", "en")).toBe("/en/software/demo-tool");
    expect(buildLanguageSwitcherHref("/skill-learning/demo-course", "en")).toBe("/en/skill-learning/demo-course");
    expect(buildLanguageSwitcherHref("/account-services/demo-service", "en")).toBe("/en/account-services/demo-service");
    expect(buildLanguageSwitcherHref("/ai-trends", "en")).toBe("/en/ai-trends");
    expect(buildLanguageSwitcherHref("/en/ai-trends", "zh")).toBe("/ai-trends");
    expect(buildLanguageSwitcherHref("/ai-trends/daily/2026-06-19", "en")).toBe("/en/ai-trends/daily/2026-06-19");
    expect(buildLanguageSwitcherHref("/en/legal/privacy-policy", "zh")).toBe("/legal/privacy-policy");
  });

  it("preserves same-path locale routes like admin and order flows, while still falling back for unrelated routes", () => {
    expect(buildLanguageSwitcherHref("/admin", "en")).toBe("/admin");
    expect(buildLanguageSwitcherHref("/admin/orders", "zh")).toBe("/admin/orders");
    expect(buildLanguageSwitcherHref("/orders", "en")).toBe("/orders");
    expect(buildLanguageSwitcherHref("/orders/order-1/pay", "zh")).toBe("/orders/order-1/pay");
    expect(buildLanguageSwitcherHref("/login", "en")).toBe("/en/login");
    expect(buildLanguageSwitcherHref("/en/login", "zh")).toBe("/login");
    expect(buildLanguageSwitcherHref("/register", "en")).toBe("/en/register");
    expect(buildLanguageSwitcherHref("/user", "en")).toBe("/en/user");
    expect(buildLanguageSwitcherHref("/en/user", "zh")).toBe("/user");
    expect(buildLanguageSwitcherHref("/relay", "zh")).toBe("/");
  });
});

describe("buildLocalePath", () => {
  it("keeps same-path locale routes stable while still localizing public paths", () => {
    expect(buildLocalePath("/admin", "en")).toBe("/admin");
    expect(buildLocalePath("/admin/users", "en")).toBe("/admin/users");
    expect(buildLocalePath("/orders/order-1", "en")).toBe("/orders/order-1");
    expect(buildLocalePath("/login", "en")).toBe("/en/login");
    expect(buildLocalePath("/register", "en")).toBe("/en/register");
    expect(buildLocalePath("/user", "en")).toBe("/en/user");
    expect(buildLocalePath("/ai-trends", "en")).toBe("/en/ai-trends");
  });
});

describe("language switcher source", () => {
  it("uses link-friendly styles and locale-aware fallback href generation", () => {
    const component = readFileSync(new URL("../components/language-switcher.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(component).toContain("buildLanguageSwitcherHref");
    expect(component).not.toContain("buildLocalePath(normalizedPath, item)");

    expect(css).toContain(".site-language-switcher a");
    expect(css).toContain(".site-language-switcher a.is-active");
    expect(css).not.toContain(".site-language-switcher button");
    expect(css).not.toContain(".site-language-switcher button.is-active");
  });
});
