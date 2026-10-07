import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src");

function read(relativePath: string) {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("AI News topic editorial token boundary", () => {
  it("mounts both topic branches in the shared editorial scope", () => {
    const page = read("app/ai-news/topics/[slug]/page-shell.tsx");

    expect(
      page.match(
        /className="ai-news-page ai-news-workspace enhe-reference-workspace ai-news-topic-page"/g,
      ) ?? [],
    ).toHaveLength(2);
    expect(page).toContain('<ContentlessState');
  });

  it("flattens legacy topic surfaces inside the light editorial scope", () => {
    const styles = read("styles/redesign/ai-news.css");

    expect(styles).toContain(".ai-news-page .surface-panel-soft");
    expect(styles).toMatch(
      /\.ai-news-page\s+\.surface-panel-soft[^\{]*\{[\s\S]*backdrop-filter:\s*none/,
    );
    expect(styles).toContain(".ai-news-page .surface-panel-soft::after");
  });

  it("keeps the DB-free state announced, actionable, and free of hero glow", () => {
    const page = read("app/ai-news/topics/[slug]/page-shell.tsx");
    const state = read("components/redesign/contentless-state.tsx");

    expect(state).toContain('role="status"');
    expect(state).toContain('aria-live="polite"');
    expect(state).toContain('data-shell-state="contentless"');
    expect(page).toContain('primaryAction={{');
    expect(page).not.toContain("radial-gradient");
    expect(page).not.toContain("border-white");
    expect(page).not.toContain("bg-white");
  });

  it("localizes the visible DB-free topic preview copy", () => {
    const dictionaries = read("lib/dictionaries.ts");
    const page = read("app/ai-news/topics/[slug]/page-shell.tsx");

    expect(dictionaries).toContain(
      'dbFreeTopicPreviewLabel: "AI资讯专题预览"',
    );
    expect(dictionaries).toContain(
      'dbFreeTopicPreviewLabel: "AI News Topic Preview"',
    );
    expect(dictionaries).toContain(
      'dbFreeTopicPreviewText: "待核验：本地预览暂不提供专题内容。"',
    );
    expect(dictionaries).toContain(
      'dbFreeTopicPreviewText: "UNVERIFIED - Topic content is not available in this local preview yet."',
    );
    expect(page).toContain("{t.aiNews.dbFreeTopicPreviewLabel}");
    expect(page).toContain("{t.aiNews.dbFreeTopicPreviewText}");
    expect(page).not.toContain("AI News Topic Preview\"}");
    expect(page).not.toContain(
      "UNVERIFIED - Topic content is not available in this local preview yet.",
    );
  });
});
