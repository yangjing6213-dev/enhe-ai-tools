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

function renderDirectory(locale: "zh" | "en", overrides: Partial<AiWorkflowCatalogCard> = {}) {
  return renderToStaticMarkup(<AiWorkflowDirectory
    locale={locale}
    filters={{ q: "", topic: "", paid: "all", environment: "all", type: "all", sort: "recommended", page: 1, pageSize: 12 }}
    items={[{ ...item, ...overrides }]}
    topics={[]}
    total={1}
    pageCount={1}
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
});
