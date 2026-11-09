import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  const absolute = join(process.cwd(), path);
  return existsSync(absolute) ? readFileSync(absolute, "utf8").replace(/\r\n/g, "\n") : "";
}

const catalog = read("src/components/redesign/software/EnheRedesignSoftwareCard.tsx");
const catalogCss = read("src/styles/redesign/software.css");
const refreshCss = read("src/styles/redesign/site-refresh.css");
const newsRoute = read("src/app/(zh-public)/ai-news/page.tsx");
const newsFilterCss = read("src/styles/redesign/ai-news.css");
const newsInteractions = read("src/components/ai-news-interactions.tsx");
const newsPageShell = read("src/app/ai-news/page-shell.tsx");
const newsWorkspaceShell = read("src/components/redesign/ai-news-workspace-shell.tsx");
const chatRoom = read("src/components/chat/ChatRoom.tsx");
const chatGroupRoute = read("src/app/api/chat/groups/[groupId]/route.ts");
const aiNewsDetailCss = read("src/styles/redesign/ai-news.css");

describe("requested public surface corrections", () => {
  it("keeps complete bilingual product card titles and only the original safety badge", () => {
    expect(catalog).toContain("data-trust-safety");
    expect(catalog).not.toContain("data-trust-price");
    expect(catalog).not.toContain("data-trust-refund");
    expect(catalogCss).not.toMatch(/\.redesign-software-card\s*\{[\s\S]*?min-height:\s*600px/);
    expect(catalogCss).not.toMatch(/\.redesign-software-card-body h3\s*\{[\s\S]*?-webkit-line-clamp:\s*3/);
    expect(catalogCss).not.toMatch(/\.redesign-software-card-secondary\s*\{[\s\S]*?-webkit-line-clamp:\s*1/);
    expect(catalogCss).not.toMatch(/\.redesign-software-card\s*\{[^}]*height:\s*\d+px/);
  });

  it("restores the original cover-first full-width product detail layout", () => {
    const detailSource = read("src/app/tools/[slug]/page-shell.tsx");
    const coverIndex = detailSource.indexOf("tool-detail-cover-frame");
    const summaryIndex = detailSource.indexOf("tool-detail-summary");
    expect(coverIndex).toBeGreaterThanOrEqual(0);
    expect(coverIndex).toBeLessThan(summaryIndex);
    expect(refreshCss).toMatch(/\.tool-detail-hero-stack\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column/);
    expect(refreshCss).not.toMatch(/@media \(width >= 1024px\)[\s\S]*?\.tool-detail-hero-stack\s*\{[^}]*grid-template-columns/);
  });

  it("keeps the AI news top navigation hidden and gives every filter the same control height", () => {
    expect(newsRoute).toContain("showNavigation={false}");
    expect(newsWorkspaceShell).toMatch(/showNavigation\s*=\s*true/);
    expect(newsPageShell).not.toMatch(/ai-news-filter-control[^\"]*lg:col-span-4/);
    expect(newsFilterCss).toMatch(/\.ai-news-filter-control\s*\{[\s\S]*?height:\s*52px/);
    expect(newsFilterCss).toMatch(/\.ai-news-filter-surface button\.ai-news-filter-control\s*\{[\s\S]*?height:\s*52px/);
  });

  it("places a compact AI news filter button before the search box", () => {
    const filterButton = newsPageShell.indexOf('<button className="ai-news-filter-control');
    const searchInput = newsPageShell.indexOf('id="ai-news-search"');

    expect(filterButton).toBeGreaterThanOrEqual(0);
    expect(searchInput).toBeGreaterThan(filterButton);
    expect(newsPageShell).toContain("lg:grid-cols-[132px_minmax(0,1fr)_180px_160px_140px]");
    expect(newsFilterCss).toMatch(/\.ai-news-filter-surface button\.ai-news-filter-control\s*\{[^}]*width:\s*132px/);
  });

  it("shows complete covers in related products on AI news detail pages", () => {
    expect(aiNewsDetailCss).toMatch(/\.ai-news-detail-page \.tool-product-card-compact\s+\.tool-product-card-cover\s+img\s*\{[^}]*object-fit:\s*contain/);
  });

  it("uses the homepage capsule treatment for public search controls", () => {
    expect(refreshCss).toMatch(/\.redesign-header-search input\s*\{[^}]*border-radius:\s*999px/);
    expect(refreshCss).toMatch(/\.enhe-search-control\s*\{[^}]*border-radius:\s*999px/);
    expect(refreshCss).toMatch(/\.enhe-search-surface\s*\{[^}]*border-radius:\s*999px/);

    const searchSurfaceClasses = [
      ["src/app/ai-news/page-shell.tsx", "enhe-search-control"],
      ["src/app/ai-skills/ai-skills-catalog.tsx", "enhe-search-control"],
      ["src/app/account-services/page-shell.tsx", "enhe-search-control"],
      ["src/app/skill-learning/page-shell.tsx", "enhe-search-control"],
      ["src/app/online-tools/page-shell.tsx", "enhe-search-control"],
      ["src/app/ai-workflows/workflow-directory.tsx", "enhe-search-control"],
      ["src/components/redesign/software/EnheRedesignSoftwareSearch.tsx", "enhe-search-control"],
      ["src/components/build-your-own-x-navigator.tsx", "enhe-search-surface"],
      ["src/components/ai-prompt-management-workbench.tsx", "enhe-search-control"],
      ["src/components/chat/ChatRoom.tsx", "enhe-search-control"],
      ["src/components/public-search-dialog.tsx", "enhe-search-surface"],
    ];

    for (const [sourcePath, className] of searchSurfaceClasses) {
      expect(read(sourcePath), sourcePath).toContain(className);
    }
  });

  it("removes the decorative frame around the AI news action toolbar", () => {
    expect(newsInteractions).not.toMatch(/className="[^"]*\bglass\b[^"]*ai-news-interactions/);
    expect(newsInteractions).not.toMatch(/ai-news-icon-action[^\"]*\bborder\b/);
    expect(newsInteractions).toContain('role="group"');
    expect(newsFilterCss).toMatch(/\.ai-news-icon-action\s*\{[^}]*border:\s*0/);
  });

  it("refreshes the composer when a timed mute expires", () => {
    expect(chatGroupRoute).toMatch(/member:\s*ownMember\s*\?\s*\{[^}]*mutedUntil:\s*ownMember\.mutedUntil/);
    expect(chatRoom).toContain("chatMuteRemainingMs(member.mutedUntil)");
    expect(chatRoom).toContain("setTimeout(refreshMuteState");
    expect(chatRoom).toContain("mutedUntil: null");
  });
});
