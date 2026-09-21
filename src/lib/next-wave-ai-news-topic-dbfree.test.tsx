import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiNewsTopics } from "@/lib/ai-news-topics";

Object.assign(globalThis, { React });

const publicContent = vi.hoisted(() => ({
  filterArticles: vi.fn((articles: unknown[]) => articles),
  getTopic: vi.fn(),
  getTopicSlugs: vi.fn(),
  getListing: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    prefetch,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => {
    void prefetch;
    return React.createElement("a", { ...props, href: String(href) }, children);
  },
}));

vi.mock("@/lib/public-content", () => ({
  filterAiNewsTopicArticles: publicContent.filterArticles,
  getPublicAiNewsTopic: publicContent.getTopic,
  getPublicAiNewsTopicSlugs: publicContent.getTopicSlugs,
  getPublicNewsListing: publicContent.getListing,
}));

const configuredArticle = {
  id: "configured-article",
  slug: "configured-article",
  title: "Configured topic article",
  summary: "Configured topic summary",
  description: "Configured topic description",
  englishTitle: "Configured topic article",
  englishSummary: "Configured topic summary",
  englishDescription: "Configured topic description",
  category: null,
};

describe("next-wave AI News topic DB-free boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DATABASE_URL;
    publicContent.getTopic.mockResolvedValue(aiNewsTopics[0]);
    publicContent.getTopicSlugs.mockResolvedValue([aiNewsTopics[0]!.slug]);
    publicContent.getListing.mockResolvedValue({ articles: [], total: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.DATABASE_URL;
  });

  it.each(["zh", "en"] as const)(
    "renders a known %s topic as a DB-free UNVERIFIED shell without reads or facts",
    async (locale) => {
      const {
        AiNewsTopicPageShell,
        generateAiNewsTopicMetadata,
        generateAiNewsTopicStaticParams,
      } = await import("@/app/ai-news/topics/[slug]/page-shell");

      const html = renderToStaticMarkup(
        await AiNewsTopicPageShell({
          slug: aiNewsTopics[0]!.slug,
          forceLocale: locale,
        }),
      );
      const metadata = await generateAiNewsTopicMetadata(
        locale,
        aiNewsTopics[0]!.slug,
      );
      const staticParams = await generateAiNewsTopicStaticParams();

      expect(html).toContain('data-content-status="UNVERIFIED"');
      expect(html).toContain("UNVERIFIED");
      expect(html).not.toContain("<script");
      expect(html).not.toContain("CollectionPage");
      expect(html).not.toContain("FAQPage");
      expect(html).not.toContain(aiNewsTopics[0]!.en.title);
      expect(html).not.toContain("Related AI news");
      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(staticParams).toContainEqual({ slug: aiNewsTopics[0]!.slug });
      expect(publicContent.getTopic).not.toHaveBeenCalled();
      expect(publicContent.getTopicSlugs).not.toHaveBeenCalled();
      expect(publicContent.getListing).not.toHaveBeenCalled();
    },
  );

  it("retains 404 for an unknown slug and configured topic rendering", async () => {
    const {
      AiNewsTopicPageShell,
      generateAiNewsTopicMetadata,
    } = await import("@/app/ai-news/topics/[slug]/page-shell");

    process.env.DATABASE_URL = "postgresql://configured.invalid/enhe";
    publicContent.getTopic.mockResolvedValue(aiNewsTopics[0]);
    publicContent.getListing.mockResolvedValue({
      articles: [configuredArticle],
      total: 1,
    });

    const html = renderToStaticMarkup(
      await AiNewsTopicPageShell({
        slug: aiNewsTopics[0]!.slug,
        forceLocale: "en",
      }),
    );
    const metadata = await generateAiNewsTopicMetadata(
      "en",
      aiNewsTopics[0]!.slug,
    );

    expect(html).toContain(aiNewsTopics[0]!.en.title);
    expect(html).toContain("Configured topic article");
    expect(html).toContain("CollectionPage");
    expect(html).not.toContain('data-content-status="UNVERIFIED"');
    expect(metadata.robots).toBeUndefined();

    publicContent.getTopic.mockResolvedValueOnce(null);
    await expect(
      AiNewsTopicPageShell({ slug: "unknown-topic", forceLocale: "en" }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
