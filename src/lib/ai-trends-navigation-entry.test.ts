import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AI trends navigation entry", () => {
  it("exposes the AI trends analysis from the public header and footer", () => {
    const header = readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8");
    const footer = readFileSync(new URL("../components/site-footer.tsx", import.meta.url), "utf8");
    const dictionaries = readFileSync(new URL("dictionaries.ts", import.meta.url), "utf8");
    const topicPage = readFileSync(new URL("../app/ai-trends/page-shell.tsx", import.meta.url), "utf8");
    const archivePage = readFileSync(new URL("../app/ai-trends/daily/page-shell.tsx", import.meta.url), "utf8");
    const detailPage = readFileSync(new URL("../app/ai-trends/daily/[date]/page-shell.tsx", import.meta.url), "utf8");

    expect(header).toContain("t.nav.aiTrends");
    expect(header).toContain('buildLocalePath("/ai-trends", locale)');
    expect(footer).toContain("t.nav.aiTrends");
    expect(footer).toContain('buildLocalePath("/ai-trends", locale)');
    expect(dictionaries).toContain('aiTrends: "AI趋势分析"');
    expect(`${dictionaries}\n${topicPage}\n${archivePage}\n${detailPage}`).not.toContain("AI趋势晨报");
    expect(`${topicPage}\n${archivePage}\n${detailPage}`).not.toContain("每日晨报");
    expect(`${topicPage}\n${archivePage}\n${detailPage}`).not.toContain("晨报归档");
  });
});
