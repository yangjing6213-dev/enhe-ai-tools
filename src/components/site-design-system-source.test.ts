import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readSource(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("shared shadcn site components", () => {
  it("keeps every route in the requested fixed light theme", () => {
    const provider = readSource("src/components/site-theme-provider.tsx");
    expect(provider).toContain('defaultTheme="light"');
    expect(provider).toContain('forcedTheme="light"');
    expect(provider).toContain("enableSystem={false}");

    for (const path of [
      "src/components/site-header.tsx",
      "src/components/redesign/enhe-redesign-header.tsx",
      "src/components/redesign/enhe-redesign-mobile-menu.tsx",
      "src/app/admin/layout.tsx",
    ]) {
      expect(readSource(path), path).not.toContain("ThemeToggle");
    }
  });

  it("builds product surfaces and primary links from official shared components", () => {
    expect(readSource("src/components/tool-card.tsx")).toContain("<Card");
    expect(readSource("src/components/redesign/software/EnheRedesignSoftwareCard.tsx")).toContain("<Card");
    expect(readSource("src/components/ui.tsx")).toContain("<Button");
  });

  it("uses white text on the darker blue primary actions", () => {
    const actionRules: Array<[string, RegExp]> = [
      ["homepage CTA", /\.redesign-home \.redesign-home-cta\s*\{[^}]*\}/],
      ["homepage brand CTA", /\.redesign-home-brand-value-cta\s*\{[^}]*\}/],
      ["software selected category", /\.redesign-software-category-button\[data-selected="true"\]\s*\{[^}]*\}/],
      ["software empty state action", /\.redesign-software-empty-action\s*\{[^}]*\}/],
      ["software load more", /\.redesign-software-load-more-button\s*\{[^}]*\}/],
      ["account primary action", /\.user-center-action--primary\s*\{[^}]*\}/],
      ["account buttons", /\.user-center-page button:not\(:disabled\)\s*\{[^}]*\}/],
      ["account primary hover", /\.user-center-action--primary:hover,[\s\S]*?\{[^}]*\}/],
      ["AI trends action", /\.ai-trends-primary-action\s*\{[^}]*\}/],
      ["contentless action", /\.enhe-contentless-page \.enhe-contentless-action-primary\s*\{[^}]*\}/],
      ["contentless action hover", /\.enhe-contentless-page \.enhe-contentless-action-primary:hover\s*\{[^}]*\}/],
      ["login action", /\.enhe-auth-page \.login-submit-button\s*\{[^}]*\}/],
      ["admin content action", /\.enhe-admin-content-primary-action\s*\{[^}]*\}/],
      ["admin content action hover", /\.enhe-admin-content-primary-action:hover\s*\{[^}]*\}/],
      ["admin selected navigation", /\.admin-nav-link\[aria-current="page"\]\s*\{[^}]*\}/],
      ["admin payment submit", /\.enhe-admin-payment-codes-form button\[type="submit"\]\s*\{[^}]*\}/],
      ["admin plans CTA", /\.enhe-admin-plans-cta\s*\{[^}]*\}/],
    ];
    const sources = [
      readSource("src/styles/redesign/home.css"),
      readSource("src/styles/redesign/software.css"),
      readSource("src/styles/redesign/account.css"),
      readSource("src/styles/redesign/site-refresh.css"),
      readSource("src/styles/redesign/shell.css"),
    ];

    for (const [name, selector] of actionRules) {
      const rule = sources.map((source) => source.match(selector)?.[0]).find(Boolean) ?? "";
      expect(rule, name).toContain("color: #fff");
    }
  });

  it("uses theme-aware text on admin actions with the marketing accent background", () => {
    const sources = [
      readSource("src/app/admin/tool-admin-list.tsx"),
      readSource("src/app/admin/ai-skill-package-upload-field.tsx"),
      readSource("src/app/admin/license-generator/license-generator-panel.tsx"),
      readSource("src/app/admin/manuals/page.tsx"),
      readSource("src/components/ai-prompt-management-workbench.tsx"),
    ];

    for (const source of sources) {
      const actionClasses = Array.from(
        source.matchAll(/"([^"\n]*bg-\[var\(--marketing-accent\)\](?!\/)[^"\n]*)"/g),
        (match) => match[1],
      );
      expect(actionClasses.length).toBeGreaterThan(0);
      for (const className of actionClasses) {
        expect(className).toContain("text-primary-foreground");
        expect(className).not.toContain("text-white");
      }
    }
  });
});
