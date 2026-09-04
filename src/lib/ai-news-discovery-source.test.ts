import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function exists(path: string) {
  return existsSync(join(process.cwd(), path));
}

describe("AI news keyword automation source contracts", () => {
  it("adds a discovery service and public content entrypoint", () => {
    expect(exists("src/lib/ai-news-discovery.ts")).toBe(true);

    const publicContent = read("src/lib/public-content.ts");
    expect(publicContent).toContain("getPublicAiNewsDiscovery");
    expect(publicContent).toContain("keywordCloudItems");
    expect(publicContent).toContain("topicCollectionItems");
  });

  it("removes hardcoded keyword/topic constants from the AI news page shell", () => {
    const pageShell = read("src/app/ai-news/page-shell.tsx");

    expect(pageShell).not.toContain("const popularKeywords = [");
    expect(pageShell).not.toContain("const topicCollections = [");
    expect(pageShell).toContain("getPublicAiNewsDiscovery");
    expect(pageShell).toContain("keywordCloudItems");
    expect(pageShell).toContain("topicCollectionItems");
  });

  it("adds schema and admin wiring for keyword intervention management", () => {
    const schema = read("prisma/schema.prisma");
    const actions = read("src/app/admin/actions.ts");
    const adminLayout = read("src/app/admin/layout.tsx");

    expect(schema).toContain("model NewsKeywordIntervention");
    expect(schema).toContain("@@unique([keyword, locale])");
    expect(actions).toContain("upsertNewsKeywordInterventionAction");
    expect(actions).toContain("deleteNewsKeywordInterventionAction");
    expect(adminLayout).toContain("/admin/ai-news/keywords");
    expect(exists("src/app/admin/ai-news/keywords/page.tsx")).toBe(true);
  });

  it("registers the AI news search analytics event", () => {
    const analytics = read("src/lib/analytics.ts");
    expect(analytics).toContain("search_ai_news");
  });
});
