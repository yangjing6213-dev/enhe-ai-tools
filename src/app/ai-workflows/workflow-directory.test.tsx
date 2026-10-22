import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiWorkflowDirectory, type AiWorkflowCatalogCard } from "./workflow-directory";

vi.mock("./workflow-interactions", () => ({ AiWorkflowFavoriteButton: () => null }));

const item: AiWorkflowCatalogCard = {
  id: "workflow-1",
  slug: "ai-workflow-123-design",
  name: "设计助手",
  englishName: "Design Assistant",
  shortDescription: "[[zh]]根据文字创建设计稿。[[/zh]]\n[[en]]Create design drafts.[[/en]]",
  coverImage: null,
  isDownloadPaid: false,
  price: 0,
  favoriteCount: 0,
  isFavorite: false,
  downloadCount: 0,
  ratingAverage: null,
  reviewCount: 0,
  projectType: "workflow",
  deliveryMode: "repository_link",
  githubStars: 100,
  verifiedEnvironments: [],
  topic: { name: "工作效率", englishName: "Productivity" },
  tags: [],
  systemRequirement: null,
};

function renderDirectory(
  locale: "zh" | "en",
  overrides: Partial<AiWorkflowCatalogCard> = {},
  items: AiWorkflowCatalogCard[] = [{ ...item, ...overrides }],
  emptyState: "no-matches" | "no-published" | "topics-unconfigured" | "unverified" = "topics-unconfigured",
) {
  return renderToStaticMarkup(<AiWorkflowDirectory
    locale={locale}
    filters={{ q: "", topic: "", paid: "all", environment: "all", type: "all", sort: "recommended", page: 1, pageSize: 12 }}
    items={items}
    topics={[]}
    total={1}
    pageCount={1}
    emptyState={emptyState}
  />);
}

describe("workflow directory localized publication", () => {
  beforeEach(() => vi.stubGlobal("React", React));
  afterEach(() => vi.unstubAllGlobals());

  it("renders the Chinese project summary without the English block or block markers", () => {
    const html = renderDirectory("zh");
    expect(html).toContain("设计助手");
    expect(html).toContain("根据文字创建设计稿。");
    expect(html).not.toContain("Create design drafts.");
    expect(html).not.toContain("[[");
  });

  it("renders the actual English translation even when it is short", () => {
    const html = renderDirectory("en");
    expect(html).toContain("Design Assistant");
    expect(html).toContain("Create design drafts.");
    expect(html).not.toContain("设计助手");
    expect(html).not.toContain("根据文字创建设计稿。");
    expect(html).not.toContain("[[");
  });

  it("uses a project-specific generated cover when no upstream image exists", () => {
    expect(renderDirectory("zh")).toContain('src="/api/ai-workflows/covers/ai-workflow-123-design"');
  });

  it("prefers the upstream cover when one is available", () => {
    expect(renderDirectory("en", { coverImage: "https://raw.githubusercontent.com/example/design/main/cover.png" }))
      .toContain('src="https://raw.githubusercontent.com/example/design/main/cover.png"');
  });

  it("clears a no-match search back to the current language directory", () => {
    const zh = renderDirectory("zh", {}, [], "no-matches");
    const en = renderDirectory("en", {}, [], "no-matches");
    expect(zh).toContain("没有匹配的工作流");
    expect(zh).toContain('href="/ai-workflows"');
    expect(en).toContain("No matching workflows");
    expect(en).toContain('href="/en/ai-workflows"');
    expect(zh).not.toContain("采集主题尚未配置");
    expect(en).not.toContain("Collection topics are not configured");
  });

  it.each([
    ["no-published", "目前还没有已发布工作流", "No workflows have been published yet"],
    ["topics-unconfigured", "工作流主题尚未配置", "Workflow topics are not configured"],
    ["unverified", "本地预览尚未连接内容源", "Local preview is not connected to a content source"],
  ] as const)("shows the %s state without claiming a filtered result", (state, zhText, enText) => {
    expect(renderDirectory("zh", {}, [], state)).toContain(zhText);
    expect(renderDirectory("en", {}, [], state)).toContain(enText);
  });
});
