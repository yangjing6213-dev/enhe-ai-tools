import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  getBackNavigationParentHref,
  shouldShowBackNavigation,
  shouldUseBrowserHistory,
} from "@/lib/back-navigation";

describe("back navigation", () => {
  it("hides only on localized home pages", () => {
    expect(shouldShowBackNavigation("/")).toBe(false);
    expect(shouldShowBackNavigation("/en")).toBe(false);
    expect(shouldShowBackNavigation("/software")).toBe(true);
    expect(shouldShowBackNavigation("/en/software")).toBe(true);
    expect(shouldShowBackNavigation("/ai-news")).toBe(true);
  });

  it("resolves top-level pages to their localized home pages", () => {
    expect(getBackNavigationParentHref("/software")).toBe("/");
    expect(getBackNavigationParentHref("/en/software")).toBe("/en");
    expect(getBackNavigationParentHref("/login")).toBe("/");
    expect(getBackNavigationParentHref("/en/user")).toBe("/en");
    expect(getBackNavigationParentHref("/admin")).toBe("/");
  });

  it("resolves public detail pages to their localized parent sections", () => {
    expect(getBackNavigationParentHref("/software/ai-voice-generator-flexible-edition")).toBe("/software");
    expect(getBackNavigationParentHref("/en/software/ai-voice-generator-flexible-edition")).toBe("/en/software");
    expect(getBackNavigationParentHref("/account-services/chatgpt-plus")).toBe("/account-services");
    expect(getBackNavigationParentHref("/skill-learning/prompt-course")).toBe("/skill-learning");
    expect(getBackNavigationParentHref("/ai-news/ai-task-scheduling")).toBe("/ai-news");
    expect(getBackNavigationParentHref("/en/ai-news/topics/local-ai")).toBe("/en/ai-news");
    expect(getBackNavigationParentHref("/product-paths/work-efficiency")).toBe("/");
    expect(getBackNavigationParentHref("/en/product-paths/media-generation")).toBe("/en");
    expect(getBackNavigationParentHref("/ai-trends/daily/2026-06-24")).toBe("/ai-trends/daily");
    expect(getBackNavigationParentHref("/legal/privacy-policy")).toBe("/");
  });

  it("resolves admin and account pages to stable parent pages", () => {
    expect(getBackNavigationParentHref("/admin/software/cm123")).toBe("/admin/software");
    expect(getBackNavigationParentHref("/admin/ai-news/import")).toBe("/admin/ai-news");
    expect(getBackNavigationParentHref("/admin/ai-news/keywords")).toBe("/admin/ai-news");
    expect(getBackNavigationParentHref("/admin/orders/cm123")).toBe("/admin/orders");
    expect(getBackNavigationParentHref("/orders/cm123/pay")).toBe("/orders/cm123");
    expect(getBackNavigationParentHref("/orders/cm123")).toBe("/user");
  });

  it("uses browser history only when it is an internal, non-empty history", () => {
    const currentOrigin = "https://www.enhe-tech.com.cn";

    expect(
      shouldUseBrowserHistory({
        currentOrigin,
        hasClientHistory: false,
        historyLength: 2,
        referrer: "https://www.enhe-tech.com.cn/software",
      }),
    ).toBe(true);
    expect(
      shouldUseBrowserHistory({
        currentOrigin,
        hasClientHistory: false,
        historyLength: 1,
        referrer: "https://www.enhe-tech.com.cn/software",
      }),
    ).toBe(false);
    expect(
      shouldUseBrowserHistory({
        currentOrigin,
        hasClientHistory: false,
        historyLength: 2,
        referrer: "https://example.com/",
      }),
    ).toBe(false);
    expect(
      shouldUseBrowserHistory({
        currentOrigin,
        hasClientHistory: true,
        historyLength: 2,
        referrer: "",
      }),
    ).toBe(true);
  });

  it("uses router history instead of a cached path", () => {
    const backNavigationBar = readFileSync("src/components/back-navigation-bar.tsx", "utf8");

    expect(backNavigationBar).toContain("router.back()");
    expect(backNavigationBar).toContain("router.replace(parentHref)");
    expect(backNavigationBar).not.toContain("sessionStorage");
    expect(backNavigationBar).not.toContain("previousInternalPath");
  });

  it("keeps the public back button aligned to the content container", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const backNav = css.match(/\.site-back-nav\s*\{[\s\S]*?\}/)?.[0] ?? "";
    const backButton = css.match(/\.site-back-nav-button\s*\{[\s\S]*?\}/)?.[0] ?? "";

    expect(backNav).toContain("max-width: 1280px");
    expect(backNav).toContain("margin: 0 auto");
    expect(backNav).toContain("padding: calc(72px + 1rem) 1rem 0");
    expect(backButton).toContain("display: inline-flex");
    expect(backButton).toContain("background: transparent");
  });
});
