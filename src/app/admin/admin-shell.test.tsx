import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(`./${relativePath}`, import.meta.url), "utf8");

describe("admin shell foundation", () => {
  it("keeps authorization first and mounts the semantic ENHE shell", () => {
    const layout = read("layout.tsx");

    expect(layout.indexOf("requireAdmin()")).toBeGreaterThanOrEqual(0);
    expect(layout.indexOf("requireAdmin()")).toBeLessThan(layout.indexOf("getCurrentLocale()"));
    expect(layout).toContain("enhe-admin-shell");
    expect(layout).toContain("redesign-skip-link");
    expect(layout).toContain("<AdminNav");
    expect(layout).toContain('id="main-content"');
  });

  it("retains the signed-in account and locale controls in the admin topbar", () => {
    const layout = read("layout.tsx");

    expect(layout).toContain("HeaderAccountControls");
    expect(layout).toContain("LanguageSwitcher");
    expect(layout).not.toContain("initialUser={adminUser}");
    expect(layout).toContain("email: adminUser.email");
    expect(layout).toContain("nickname: adminUser.nickname");
    expect(layout).toContain("role: adminUser.role");
    expect(layout).toContain("getDictionary(locale)");
  });

  it("renders locale-aware active navigation without changing route ownership", () => {
    const nav = read("admin-nav.tsx");

    expect(nav).toContain('"use client"');
    expect(nav).toContain("usePathname");
    expect(nav).toContain('aria-current={isActive ? "page" : undefined}');
    expect(nav).toContain("admin-nav-link");
    expect(nav).toContain("aria-label");
  });

  it("uses the locked light token bridge and preserves form focus", () => {
    const ui = read("admin-ui.tsx");
    const shell = read("../../styles/redesign/shell.css");

    expect(ui).toContain("enhe-admin-field");
    expect(ui).toContain("enhe-admin-input");
    expect(shell).toContain(".enhe-redesign-production.enhe-admin-shell");
    expect(shell).toContain(".enhe-admin-shell .admin-nav-link[aria-current=\"page\"]");
    expect(shell).toContain(".enhe-admin-shell :is(input, select, textarea, button, a):focus-visible");
    const adminFocusRule = shell.match(
      /\.enhe-admin-shell \.admin-nav-link:focus-visible,[\s\S]*?outline-offset: 3px;[\s\S]*?\}/,
    )?.[0];
    expect(adminFocusRule).toContain("box-shadow: 0 0 0 7px var(--enhe-text);");
    const adminInputFocusRule = shell.match(
      /\.enhe-admin-shell \.enhe-admin-input:focus\s*\{[^}]*\}/,
    )?.[0];
    expect(adminInputFocusRule).toContain("0 0 0 7px var(--enhe-text)");
  });
});
