import { describe, expect, it } from "vitest";
import { REDESIGN_NAV_ITEMS, isExactCurrentPage } from "./navigation";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const headerSource = readFileSync(
  join(process.cwd(), "src/components/redesign/enhe-redesign-header.tsx"),
  "utf8",
);
const mobileMenuSource = readFileSync(
  join(process.cwd(), "src/components/redesign/enhe-redesign-mobile-menu.tsx"),
  "utf8",
);
const globalStyles = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const navigationMenuSource = readFileSync(join(process.cwd(), "src/components/ui/navigation-menu.tsx"), "utf8");

describe("public navigation current-page state", () => {
  it("marks only the exact destination as the current page", () => {
    expect(isExactCurrentPage("/ai-news", "/ai-news")).toBe(true);
    expect(isExactCurrentPage("/ai-news/topics", "/ai-news")).toBe(false);
    expect(isExactCurrentPage("/ai-news/topics/ai-agent", "/ai-news")).toBe(false);
    expect(isExactCurrentPage("/en/ai-news/topics", "/en/ai-news")).toBe(false);
  });

  it("puts Home first and removes the old Search link in both locale menus", () => {
    expect(REDESIGN_NAV_ITEMS.zh[0]).toMatchObject({ label: "首页", href: "/" });
    expect(REDESIGN_NAV_ITEMS.en[0]).toMatchObject({ label: "Home", href: "/en" });
    expect(REDESIGN_NAV_ITEMS.zh.some((item) => String(item.href) === "/search")).toBe(false);
    expect(REDESIGN_NAV_ITEMS.en.some((item) => String(item.href) === "/en/search")).toBe(false);
    expect(headerSource).not.toContain("redesign-search-icon");
    expect(mobileMenuSource).not.toContain("redesign-search-icon");
  });

  it("keeps the language switch at the far right after the account control", () => {
    const accountControlIndex = headerSource.indexOf("<EnheAccountMenu>");
    const languageSwitchIndex = headerSource.indexOf("<EnheRedesignLanguageSwitch");

    expect(accountControlIndex).toBeGreaterThanOrEqual(0);
    expect(headerSource).not.toContain("ThemeToggle");
    expect(languageSwitchIndex).toBeGreaterThan(accountControlIndex);
  });

  it("omits the automatic all-items link from the AI Skill dropdown", () => {
    expect(headerSource).not.toContain("查看全部");
  });

  it("keeps AI resource destinations under the renamed resource menu in both locales", () => {
    expect(REDESIGN_NAV_ITEMS.zh.find((item) => item.href === "/ai-skills")).toMatchObject({
      label: "AI资源",
    });
    expect(REDESIGN_NAV_ITEMS.zh.find((item) => item.href === "/ai-skills")?.children)
      .toContainEqual({ label: "项目与资料", href: "/ai-workflows" });
    expect(REDESIGN_NAV_ITEMS.en.find((item) => item.href === "/en/ai-skills")?.children)
      .toContainEqual({ label: "Projects & Resources", href: "/en/ai-workflows" });
  });

  it("uses distinct AI Resources and AI Community labels without duplicate parent and child names", () => {
    expect(REDESIGN_NAV_ITEMS.zh.find((item) => item.href === "/forum")?.label).toBe("AI社区");
    expect(REDESIGN_NAV_ITEMS.en.find((item) => item.href === "/en/forum")?.label).toBe("AI Community");
    const zhResourcesMenu = REDESIGN_NAV_ITEMS.zh.find((item) => "children" in item);
    const enResourcesMenu = REDESIGN_NAV_ITEMS.en.find((item) => "children" in item);
    const zhResources = zhResourcesMenu?.children ?? [];
    const enResources = enResourcesMenu?.children ?? [];
    expect(zhResourcesMenu?.label).toBe("AI资源");
    expect(enResourcesMenu?.label).toBe("AI Resources");
    expect(zhResources.map((item) => item.label)).toEqual(["提示词库", "AI技能包", "项目与资料"]);
    expect(enResources.map((item) => item.label)).toEqual(["Prompt Library", "AI Skill Packs", "Projects & Resources"]);
  });

  it("allows desktop dropdown content to float without expanding the header", () => {
    const dropdownRule = globalStyles.match(/\.site-nav-menu-content\s*\{[^}]*\}/)?.[0] ?? "";

    expect(dropdownRule).not.toMatch(/position:\s*relative/);
    expect(navigationMenuSource).toContain("md:absolute");
  });
});
