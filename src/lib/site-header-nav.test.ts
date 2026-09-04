import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("site header navigation", () => {
  it("keeps the homepage nav first, restores the admin entry for admin sessions, and removes updates from the header nav", () => {
    const source = readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8");
    const accountControlsSource = readFileSync(new URL("../components/header-account-controls.tsx", import.meta.url), "utf8");
    const updatesNavIndex = source.indexOf("t.nav.updates");

    expect(source).toContain("nav.home");
    expect(source).toContain("nav.software");
    expect(source).toContain("nav.onlineTools");
    expect(source).toContain("nav.skillLearning");
    expect(source).toContain("nav.aiNews");
    expect(source).toContain('href: buildLocalePath("/account-services", locale)');
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
    expect(source).not.toContain('"/tutorials"');
    expect(source).not.toContain("t.nav.tutorials");
    expect(source).not.toContain('href: buildLocalePath("/#updates", locale)');
    expect(updatesNavIndex).toBe(-1);
  });

  it("loads shared header session state on the client so public pages remain cacheable", () => {
    const source = readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8");
    const accountControlsSource = readFileSync(new URL("../components/header-account-controls.tsx", import.meta.url), "utf8");
    const sessionSource = readFileSync(new URL("../components/header-session.ts", import.meta.url), "utf8");
    const sessionGateSource = readFileSync(new URL("../components/header-session-gate.tsx", import.meta.url), "utf8");
    const adminNavSource = readFileSync(new URL("../components/header-admin-nav-link.tsx", import.meta.url), "utf8");
    const authSource = readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");
    const cookieSource = readFileSync(new URL("../lib/header-user-cookie.ts", import.meta.url), "utf8");

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
    expect(cookieSource).toContain('export const headerUserCookieName = "enhe_header_user"');
  });

  it("keeps the desktop header nav on the same center axis as the homepage hero and widens nav spacing by ten percent", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/\r\n/g, "\n");

    expect(css).toContain("grid-template-columns: minmax(14rem, 1fr) auto minmax(14rem, 1fr);");
    expect(css).toContain(".site-primary-nav {\n  grid-column: 2;");
    expect(css).toContain("gap: clamp(0.385rem, 1.32vw, 0.825rem);");
    expect(css).toContain(".home-hero-centered {\n  display: flex;\n  width: min(100%, 1222px);\n  max-width: 1222px;\n  margin: 0 auto;");
  });
});
