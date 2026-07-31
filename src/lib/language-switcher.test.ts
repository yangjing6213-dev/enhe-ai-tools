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
    expect(buildLanguageSwitcherHref("/product-paths/work-efficiency", "en")).toBe("/en/product-paths/work-efficiency");
    expect(buildLanguageSwitcherHref("/en/product-paths/media-generation", "zh")).toBe("/product-paths/media-generation");
    expect(buildLanguageSwitcherHref("/ai-trends", "en")).toBe("/en/ai-trends");
    expect(buildLanguageSwitcherHref("/en/ai-trends", "zh")).toBe("/ai-trends");
    expect(buildLanguageSwitcherHref("/ai-trends/daily/2026-06-19", "en")).toBe("/en/ai-trends/daily/2026-06-19");
    expect(buildLanguageSwitcherHref("/en/legal/privacy-policy", "zh")).toBe("/legal/privacy-policy");
  });

  it("keeps same-path locale routes in place while still triggering explicit locale switching", () => {
    expect(buildLanguageSwitcherHref("/admin", "en")).toBe("/admin?locale=en");
    expect(buildLanguageSwitcherHref("/admin/orders", "zh")).toBe(
      "/admin/orders?locale=zh",
    );
    expect(buildLanguageSwitcherHref("/orders", "en")).toBe(
      "/orders?locale=en",
    );
    expect(buildLanguageSwitcherHref("/orders/order-1/pay", "zh")).toBe(
      "/orders/order-1/pay?locale=zh",
    );
    expect(buildLanguageSwitcherHref("/login", "en")).toBe("/en/login");
    expect(buildLanguageSwitcherHref("/en/login", "zh")).toBe("/login");
    expect(buildLanguageSwitcherHref("/register", "en")).toBe("/en/register");
    expect(buildLanguageSwitcherHref("/user", "en")).toBe("/en/user");
    expect(buildLanguageSwitcherHref("/en/user", "zh")).toBe("/user");
    expect(buildLanguageSwitcherHref("/relay", "zh")).toBe("/?locale=zh");
  });

  it("falls back to the English news index for Chinese pagination URLs", () => {
    expect(buildLanguageSwitcherHref("/ai-news/page/20", "en")).toBe(
      "/en/ai-news",
    );
    expect(buildLanguageSwitcherHref("/ai-news/page/10", "en")).toBe(
      "/en/ai-news",
    );
    expect(buildLanguageSwitcherHref("/ai-news/page/37", "en")).toBe(
      "/en/ai-news",
    );
    expect(buildLanguageSwitcherHref("/en/ai-news/page/2", "zh")).toBe(
      "/ai-news/page/2",
    );
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
  it("uses full document links with locale-aware fallback href generation", () => {
    const component = readFileSync(new URL("../components/language-switcher.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(component).toContain("buildLanguageSwitcherHref");
    expect(component).not.toContain("buildLocalePath(normalizedPath, item)");
    expect(component).not.toContain('import Link from "next/link"');
    expect(component).toContain("<a");

    expect(css).toContain(".site-language-switcher a");
    expect(css).toContain(".site-language-switcher a.is-active");
    expect(css).not.toContain(".site-language-switcher button");
    expect(css).not.toContain(".site-language-switcher button.is-active");
  });
});
