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

describe("requested public surface corrections", () => {
  it("keeps complete bilingual product card titles and only the original safety badge", () => {
    expect(catalog).toContain("data-trust-safety");
    expect(catalog).not.toContain("data-trust-price");
    expect(catalog).not.toContain("data-trust-refund");
    expect(catalogCss).not.toMatch(/\.redesign-software-card\s*\{[\s\S]*?min-height:\s*600px/);
    expect(catalogCss).not.toMatch(/\.redesign-software-card-body h3\s*\{[\s\S]*?-webkit-line-clamp:\s*3/);
    expect(catalogCss).not.toMatch(/\.redesign-software-card-secondary\s*\{[\s\S]*?-webkit-line-clamp:\s*1/);
    expect(catalogCss).toMatch(/\.redesign-software-card-frame\s*\{[^}]*max-height:\s*180px/);
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
