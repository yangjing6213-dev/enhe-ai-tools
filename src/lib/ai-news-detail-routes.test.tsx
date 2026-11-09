import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/ai-news/[slug]/page-shell", () => ({
  AiNewsDetailPageShell: () => null,
  generateAiNewsDetailPageMetadata: vi.fn(async () => ({})),
}));
vi.mock("@/components/public-site-chrome", () => ({
  PublicSiteChrome: ({ children }: { children: React.ReactNode }) => children,
}));

import AiNewsDetailPage from "@/app/(zh-public)/ai-news/[slug]/page";
import EnglishAiNewsDetailPage from "@/app/en/ai-news/[slug]/page";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

describe.each([
  ["zh", AiNewsDetailPage],
  ["en", EnglishAiNewsDetailPage],
] as const)("%s AI news article route", (_locale, Page) => {
  it("omits the Latest and Topics section navigation", async () => {
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ slug: "article-fixture" }) }));

    expect(html).not.toContain("<nav");
    expect(html).toContain('class="ai-news-section-content"');
  });
});
