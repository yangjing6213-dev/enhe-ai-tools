import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiNewsWorkspaceShell } from "@/components/redesign/ai-news-workspace-shell";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("Typeshare alignment contract", () => {
  it("defines a shared reference vocabulary for marketing and workspace shells", () => {
    const tokens = read("src/styles/redesign/tokens.css");
    const shell = read("src/styles/redesign/shell.css");

    expect(tokens).toContain("--enhe-reference-brand");
    expect(tokens).toContain("--enhe-reference-sidebar-width");
    expect(tokens).toContain("--enhe-reference-topbar-height");
    expect(shell).toContain(".enhe-reference-editorial");
    expect(shell).toContain(".enhe-reference-workspace");
  });

  it("keeps the three requested surfaces on the shared reference structure", () => {
    const about = read("src/app/about/page-shell.tsx");
    const news = read("src/app/ai-news/page-shell.tsx");
    const admin = read("src/app/admin/layout.tsx");
    const workspace = read("src/components/redesign/ai-news-workspace-shell.tsx");

    expect(about).toContain("enhe-reference-editorial");
    expect(news).toContain("ai-news-workspace");
    expect(news).toContain("enhe-reference-workspace");
    expect(workspace).toContain("ai-news-section-nav");
    expect(workspace).not.toContain("ai-news-reference-topbar");
    expect(workspace).not.toContain("ai-news-reference-language-link");
    expect(admin).toContain("enhe-reference-app-shell");
    expect(admin).toContain("admin-topbar");
  });

  it("keeps AI News on the shared masthead with only a local Latest/Topics navigation", () => {
    const workspace = read("src/components/redesign/ai-news-workspace-shell.tsx");

    expect(workspace.match(/<nav\b/g)).toHaveLength(1);
    expect(workspace).not.toMatch(/<(?:header|aside)\b/i);
    expect(workspace).not.toMatch(/ai-news-[\w-]*topbar/i);
    expect(workspace).not.toMatch(/redesign-(?:language-switch|login-link|account-menu)/);
  });

  it.each([
    ["zh", "/ai-news/article-slug", "/ai-news"],
    ["zh", "/ai-news/page/2", "/ai-news"],
    ["en", "/en/ai-news/article-slug", "/en/ai-news"],
    ["en", "/en/ai-news/page/2", "/en/ai-news"],
  ] as const)(
    "marks the Latest section current by location on %s descendant route %s",
    (locale, currentPathname, latestHref) => {
      const props: ComponentProps<typeof AiNewsWorkspaceShell> = {
        locale,
        currentPathname,
        children: "Local test content",
      };
      const html = renderToStaticMarkup(
        createElement(AiNewsWorkspaceShell, props),
      );

      expect(html).toContain(
        `<a href="${latestHref}" aria-current="location">`,
      );
    },
  );
});
