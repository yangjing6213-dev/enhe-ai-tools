import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("site header navigation", () => {
  it("keeps core nav entries and removes obsolete top-level account-service dropdown", () => {
    const source = readFileSync(
      new URL("../components/site-header.tsx", import.meta.url),
      "utf8",
    );
    const accountControlsSource = readFileSync(
      new URL("../components/header-account-controls.tsx", import.meta.url),
      "utf8",
    );
    const updatesNavIndex = source.indexOf("t.nav.updates");

    expect(source).toContain("nav.home");
    expect(source).toContain("nav.software");
    expect(source).toContain("nav.skillLearning");
    expect(source).toContain("nav.aiNews");
    expect(source).toContain("nav.aiTrends");
    expect(source).toContain('href: buildLocalePath("/account-services", locale)');
    expect(source).not.toContain('label: t.nav.onlineTools,\n      href: buildLocalePath("/account-services", locale),');
    expect(source).not.toContain('href: buildLocalePath("/online-tools", locale)');
    expect(source).toContain('href: buildLocalePath("/ai-news", locale)');
    expect(source).toContain("t.nav.login");
    expect(source).toContain("t.nav.admin");
    expect(source).toContain("HeaderAdminNavLink");
    expect(source).toContain("HeaderSessionGate");
    expect(source).not.toContain("getHeaderUserSnapshot");
    expect(source).toContain("const headerUser = null");
    expect(accountControlsSource).not.toContain("labels.admin");
    expect(accountControlsSource).not.toContain("site-admin-link");
    expect(source).not.toContain('href: buildLocalePath("/tutorials", locale)');
    expect(source).not.toContain("t.nav.tutorials");
    expect(source).not.toContain('href: buildLocalePath("/pricing", locale)');
    expect(source).not.toContain("Pricing");
    expect(source).not.toContain("Upgrade subscription");
    expect(source).not.toContain("Account order");
    expect(source).not.toContain('href: buildLocalePath("/#updates", locale)');
    expect(updatesNavIndex).toBe(-1);
  });

  it("places account services inside the skill learning dropdown", () => {
    const source = readFileSync(
      new URL("../components/site-header.tsx", import.meta.url),
      "utf8",
    );
    const skillLearningIndex = source.indexOf("label: t.nav.skillLearning");
    const accountServiceIndex = source.indexOf("label: t.nav.onlineTools");
    const buildYourOwnXIndex = source.indexOf("Build Your Own X Navigator");

    expect(skillLearningIndex).toBeGreaterThan(-1);
    expect(accountServiceIndex).toBeGreaterThan(skillLearningIndex);
    expect(buildYourOwnXIndex).toBeGreaterThan(accountServiceIndex);
    expect(source).toContain("Account service guidance and access notes");
    expect(source).toContain("AI账号服务咨询与使用说明");
  });

  it("uses category landing links for software dropdown entries", () => {
    const source = readFileSync(
      new URL("../components/site-header.tsx", import.meta.url),
      "utf8",
    );
    const categorySource = readFileSync(
      new URL("../lib/software-category-navigation.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("softwareSearchHref");
    expect(source).toContain("softwareNavCategories.map");
    expect(source).toContain("buildSoftwareCategoryHref");
    expect(categorySource).toContain("视频生成");
    expect(categorySource).toContain("语音生成");
    expect(categorySource).toContain("智能体");
    expect(categorySource).toContain("视频/图片处理");
    expect(categorySource).toContain("提升效率");
    expect(categorySource).toContain("Video generation");
    expect(categorySource).toContain("Voice generation");
    expect(categorySource).toContain("Agents");
    expect(categorySource).toContain("Video/image processing");
    expect(categorySource).toContain("Productivity");
    expect(categorySource).toContain("/software?categoryName=");
    expect(source).not.toContain("AI video generation");
    expect(source).not.toContain("AI voice generation");
    expect(source).not.toContain("AI agents");
    expect(source).not.toContain("AI video/image processing");
    expect(source).not.toContain("AI productivity");
  });

  it("uses hover and focus for desktop dropdown visibility", () => {
    const source = readFileSync(
      new URL("../components/site-header.tsx", import.meta.url),
      "utf8",
    );
    const dropdownSource = readFileSync(
      new URL("../components/public-nav-dropdown.tsx", import.meta.url),
      "utf8",
    );
    const mobileSource = readFileSync(
      new URL("../components/mobile-nav-menu.tsx", import.meta.url),
      "utf8",
    );
    const css = readFileSync(
      new URL("../app/globals.css", import.meta.url),
      "utf8",
    ).replace(/\r\n/g, "\n");

    expect(source).not.toContain("<details key={item.href} className=\"site-nav-dropdown\">");
    expect(source).toContain("<PublicNavDropdown");
    expect(source).toContain("exact={child.href === item.href}");
    expect(mobileSource).toContain("exact={child.href === item.href}");
    expect(dropdownSource).toContain("useState(false)");
    expect(dropdownSource).toContain("onPointerEnter");
    expect(dropdownSource).toContain("inert={dismissed ? true : undefined}");
    expect(css).toContain(".site-nav-dropdown::after {");
    expect(css).toContain("height: 12px;");
    expect(css).toContain(".site-nav-dropdown:hover .site-nav-dropdown-panel,");
    expect(css).toContain(".site-nav-dropdown:focus-within .site-nav-dropdown-panel");
    expect(css).toContain(".site-nav-dropdown.is-dismissed .site-nav-dropdown-panel");
    expect(css).not.toContain(".site-nav-dropdown[open] .site-nav-dropdown-panel");
    expect(css).not.toContain(".site-nav-dropdown[open] .site-nav-dropdown-trigger");
  });

  it("keeps legacy categoryName URLs noindex while using fixed catalog keys", () => {
    const pageSource = readFileSync(
      new URL("../app/software/page-shell.tsx", import.meta.url),
      "utf8",
    );
    const productionSource = readFileSync(
      new URL("../lib/redesign/software/software-production.ts", import.meta.url),
      "utf8",
    );
    const categorySource = readFileSync(
      new URL("../lib/software-category-navigation.ts", import.meta.url),
      "utf8",
    );

    expect(pageSource).toContain("categoryName");
    expect(pageSource).toContain("hasUnsupportedLegacyFilter");
    expect(pageSource).not.toContain("resolveSoftwareCategoryIdByName");
    expect(productionSource).toContain("searchParams.category");
    expect(productionSource).toContain("leafCategoryIds");
    expect(categorySource).toContain("resolveSoftwareCategoryIdByName");
    expect(categorySource).toContain("resolveLocalizedToolCategoryName");
  });

  it("loads shared header session state on the client so public pages remain cacheable", () => {
    const source = readFileSync(
      new URL("../components/site-header.tsx", import.meta.url),
      "utf8",
    );
    const accountControlsSource = readFileSync(
      new URL("../components/header-account-controls.tsx", import.meta.url),
      "utf8",
    );
    const sessionSource = readFileSync(
      new URL("../components/header-session.ts", import.meta.url),
      "utf8",
    );
    const sessionGateSource = readFileSync(
      new URL("../components/header-session-gate.tsx", import.meta.url),
      "utf8",
    );
    const adminNavSource = readFileSync(
      new URL("../components/header-admin-nav-link.tsx", import.meta.url),
      "utf8",
    );
    const authSource = readFileSync(
      new URL("../lib/auth.ts", import.meta.url),
      "utf8",
    );
    const cookieSource = readFileSync(
      new URL("../lib/header-user-cookie.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("HeaderSessionGate");
    expect(source).toContain("HeaderAdminNavLink");
    expect(source).toContain("initialUser={headerUser}");
    expect(accountControlsSource).toContain("useHeaderSessionUser");
    expect(accountControlsSource).toContain("initialUser");
    expect(accountControlsSource).toContain("if (!loaded)");
    expect(accountControlsSource).not.toContain('fetch("/api/session"');
    expect(sessionSource).toContain("cachedUser");
    expect(sessionSource).toContain("inflightSessionRequest");
    expect(sessionSource).toContain('fetch("/api/session", { cache: "no-store" })');
    expect(sessionSource).not.toContain("readHeaderUserCookie");
    expect(sessionGateSource).toContain('showAdmin={user?.role === "admin"}');
    expect(adminNavSource).toContain('if (user?.role !== "admin") return null;');
    expect(source).not.toContain("getHeaderUserSnapshot");
    expect(authSource).toContain("signHeaderUserCookieValue");
    expect(authSource).toContain("httpOnly: true");
    expect(cookieSource).toContain(
      'export const headerUserCookieName = "enhe_header_user"',
    );
  });

  it("keeps the desktop header nav on the same center axis as the homepage hero and widens nav spacing by ten percent", () => {
    const css = readFileSync(
      new URL("../app/globals.css", import.meta.url),
      "utf8",
    ).replace(/\r\n/g, "\n");

    expect(css).toContain(
      "grid-template-columns: minmax(14rem, 1fr) auto minmax(14rem, 1fr);",
    );
    expect(css).toContain(".site-primary-nav {\n  grid-column: 2;");
    expect(css).toContain("gap: clamp(0.385rem, 1.32vw, 0.825rem);");
    expect(css).toContain(
      ".home-hero-centered {\n  display: flex;\n  width: min(100%, 1222px);\n  max-width: 1222px;\n  margin: 0 auto;",
    );
  });
});
