import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
const readRepo = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

describe("AI News topic and keyword admin presentation", () => {
  it("uses the shared content shell for list, editor, and keyword management", () => {
    const routes = [
      "app/admin/ai-news/topics/page.tsx",
      "app/admin/ai-news/topics/[id]/page.tsx",
      "app/admin/ai-news/keywords/page.tsx"
    ];

    for (const route of routes) {
      const source = read(route);
      expect(source).toContain("AdminContentShell");
      expect(source).toContain("enhe-admin-content-management");
    }
  });

  it("keeps existing topic and keyword data actions and fields", () => {
    const topicList = read("app/admin/ai-news/topics/page.tsx");
    const topicEditor = read("app/admin/ai-news/topics/[id]/page.tsx");
    const keywords = read("app/admin/ai-news/keywords/page.tsx");

    expect(topicList).toContain("action={deleteNewsTopicAction}");
    expect(topicEditor).toContain("action={upsertNewsTopicAction}");
    for (const name of ["englishSearchQuery", "keywords", "englishKeywords", "sourceLinks", "faqs", "englishFaqs"]) {
      expect(topicEditor).toContain(`name="${name}"`);
    }
    expect(keywords).toContain("action={upsertNewsKeywordInterventionAction}");
    expect(keywords).toContain("action={deleteNewsKeywordInterventionAction}");
    for (const name of ["keyword", "locale", "displayName", "weightBoost", "isPinned", "isHidden"]) {
      expect(keywords).toContain(`name="${name}"`);
    }
    expect(keywords).toContain("getPublicAiNewsDiscovery");
  });

  it("does not offer to create a hard-coded topic from an empty list", () => {
    const topicList = read("app/admin/ai-news/topics/page.tsx");

    expect(topicList).toContain('href="/admin/ai-news/topics/new"');
    expect(topicList).not.toContain("action={upsertNewsTopicAction}");
    expect(topicList).not.toContain('value="ai-agent"');
  });

  it("exposes contained list, editor, preview, and keyword-rule surfaces", () => {
    const topicList = read("app/admin/ai-news/topics/page.tsx");
    const keywords = read("app/admin/ai-news/keywords/page.tsx");
    const shell = readRepo("src/styles/redesign/shell.css");

    expect(topicList).toContain("enhe-admin-content-toolbar");
    expect(topicList).toContain("enhe-admin-content-primary-action");
    expect(keywords).toContain("enhe-admin-content-toolbar");
    expect(keywords).toContain("enhe-admin-keyword-create-form");
    expect(topicList).toContain("enhe-admin-content-table");
    expect(topicList).toContain("enhe-admin-content-row");
    expect(keywords).toContain("enhe-admin-keyword-preview-grid");
    expect(keywords).toContain("enhe-admin-keyword-rule-card");
    for (const selector of [
      ".enhe-admin-content-management",
      ".enhe-admin-topic-editor-form",
      ".enhe-admin-keyword-create-form",
      ".enhe-admin-keyword-preview-card",
      ".enhe-admin-keyword-rule-card"
    ]) {
      expect(shell).toContain(selector);
    }
  });
});
