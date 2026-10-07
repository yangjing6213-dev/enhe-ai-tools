import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src");

function read(relativePath: string) {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("AI News DB-free metadata localization", () => {
  it("keeps topic and detail unavailable metadata locale-aware", () => {
    const dictionaries = read("lib/dictionaries.ts");
    const topic = read("app/ai-news/topics/[slug]/page-shell.tsx");
    const detail = read("app/ai-news/[slug]/page-shell.tsx");

    expect(dictionaries).toContain(
      'dbFreeTopicMetaDescription: "待核验：本地预览不提供 AI 资讯专题内容。"',
    );
    expect(dictionaries).toContain(
      'dbFreeTopicMetaDescription: "UNVERIFIED - AI News topic content is not available in this local preview."',
    );
    expect(dictionaries).toContain(
      'dbFreeDetailMetaDescription: "待核验：本地预览不提供 AI 资讯详情内容。"',
    );
    expect(dictionaries).toContain(
      'dbFreeDetailMetaDescription: "UNVERIFIED - AI News detail content is not available in this local preview."',
    );
    expect(topic).toContain("description: t.aiNews.dbFreeTopicMetaDescription");
    expect(detail).toContain("description: t.aiNews.dbFreeDetailMetaDescription");
    expect(topic).not.toContain(
      '"UNVERIFIED - AI News topic content is not available in this local preview."',
    );
    expect(detail).not.toContain(
      '"UNVERIFIED - AI News detail content is not available in this local preview."',
    );
  });
});
