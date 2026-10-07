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

describe("public navigation current-page state", () => {
  it("marks only the exact destination as the current page", () => {
    expect(isExactCurrentPage("/ai-news", "/ai-news")).toBe(true);
    expect(isExactCurrentPage("/ai-news/topics", "/ai-news")).toBe(false);
    expect(isExactCurrentPage("/ai-news/topics/ai-agent", "/ai-news")).toBe(false);
    expect(isExactCurrentPage("/en/ai-news/topics", "/en/ai-news")).toBe(false);
  });

  it("puts a Home destination first in both locale menus and keeps Search as text", () => {
    expect(REDESIGN_NAV_ITEMS.zh[0]).toMatchObject({ label: "首页", href: "/" });
    expect(REDESIGN_NAV_ITEMS.en[0]).toMatchObject({ label: "Home", href: "/en" });
    expect(REDESIGN_NAV_ITEMS.zh.some((item) => item.href === "/search")).toBe(true);
    expect(REDESIGN_NAV_ITEMS.en.some((item) => item.href === "/en/search")).toBe(true);
    expect(headerSource).not.toContain("redesign-search-icon");
    expect(mobileMenuSource).not.toContain("redesign-search-icon");
  });

  it("places the desktop language switch before the account control", () => {
    const desktopNav = headerSource.slice(
      headerSource.indexOf('<nav className="redesign-desktop-nav"'),
      headerSource.indexOf("</nav>", headerSource.indexOf('<nav className="redesign-desktop-nav"')),
    );

    const accountControlIndex = desktopNav.indexOf("account.status");
    const languageSwitchIndex = desktopNav.indexOf("<EnheRedesignLanguageSwitch");
    expect(languageSwitchIndex).toBeGreaterThanOrEqual(0);
    expect(accountControlIndex).toBeGreaterThan(languageSwitchIndex);
  });
});
