import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("ENHE visual polish contract", () => {
  it("uses the approved rounded font for Chinese and English", () => {
    const tokens = read("src/styles/redesign/tokens.css");

    expect(tokens).toMatch(/--enhe-font-zh:\s*"Alimama Fang Yuan Ti"/);
    expect(tokens).toMatch(/--enhe-font-en:\s*"Alimama Fang Yuan Ti"/);
    expect(tokens).not.toContain('"Source Sans 3"');
  });

  it("uses the approved redesigned shell on both account routes", () => {
    const chineseLayout = read("src/app/user/layout.tsx");
    const englishLayout = read("src/app/en/user/layout.tsx");
    const accountShell = read("src/components/redesign/enhe-account-shell.tsx");
    const page = read("src/app/user/page-shell.tsx");
    const styles = read("src/styles/redesign/account.css");

    expect(chineseLayout).toContain("EnheAccountShell");
    expect(englishLayout).toContain("EnheAccountShell");
    expect(accountShell).toContain("EnheRedesignPublicHeader");
    expect(accountShell).toContain("EnheRedesignPublicFooter");
    expect(accountShell).toContain('id="main-content"');
    expect(page).toContain('className="user-center-page py-14"');
    expect(styles).toContain(".user-center-panel");
    expect(styles).toContain(".user-center-record");
    expect(styles).toContain(".user-center-page .status-success");
    expect(styles).toContain(".user-center-page .status-danger");
    expect(page).toContain('wrapperClassName="user-center-password-input"');
    expect(page).not.toContain("text-[#8B95A7]");
    expect(page).not.toContain("border-white/10");
  });

  it("keeps private account routes out of public discovery", () => {
    const chineseLayout = read("src/app/user/layout.tsx");
    const englishLayout = read("src/app/en/user/layout.tsx");
    const publicRoutes = read("src/lib/public-discovery-manifest.ts");

    expect(chineseLayout).toContain("index: false");
    expect(englishLayout).toContain("index: false");
    expect(publicRoutes).not.toContain('path: "/user"');
    expect(publicRoutes).not.toContain('path: "/en/user"');
  });

  it("uses light-surface tokens for AI News actions and honors reduced motion", () => {
    const interactions = read("src/components/ai-news-interactions.tsx");
    const newsPage = read("src/app/ai-news/page-shell.tsx");
    const newsCardStart = newsPage.indexOf("function NewsCard(");
    const nextFunctionStart = newsPage.indexOf("\nfunction ", newsCardStart + 1);
    expect(newsCardStart).toBeGreaterThanOrEqual(0);
    const newsCard = newsPage.slice(
      newsCardStart,
      nextFunctionStart === -1 ? undefined : nextFunctionStart,
    );
    const accountStyles = read("src/styles/redesign/account.css");
    const newsStyles = read("src/styles/redesign/ai-news.css");
    const shellStyles = read("src/styles/redesign/shell.css");

    expect(interactions).toContain("ai-news-action");
    expect(interactions).not.toContain("border-white/");
    expect(interactions).not.toContain("bg-white/");
    expect(newsCard).toContain("ai-news-interactive-card glass");
    expect(newsCard).toContain("text-[var(--marketing-text)]");
    expect(newsCard).toContain("text-[var(--marketing-muted)]");
    expect(newsStyles).toContain(".ai-news-action");
    expect(newsStyles).toContain(".ai-news-interactive-card");
    expect(newsStyles).toContain("var(--marketing-border)");
    expect(newsStyles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(accountStyles).toContain("@media (hover: hover) and (prefers-reduced-motion: no-preference)");
    expect(accountStyles).toContain("user-center-record:hover");
    expect(shellStyles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
