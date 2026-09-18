import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

const db = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    aiTrendBriefing: {
      findMany: db.findMany,
      findFirst: db.findFirst,
    },
  },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement("a", { ...props, href: String(href) }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
  }),
}));

describe("E1-NB-R23 AI Trends DB-free preview", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.DATABASE_URL;
    db.findMany.mockResolvedValue([]);
    db.findFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.DATABASE_URL;
  });

  it("returns type-compatible empty trend results without querying Prisma", async () => {
    const {
      getAiTrendBriefingByDateSlug,
      getAiTrendBriefingSummaries,
      getLatestPublishedAiTrendBriefingWithVideo,
    } = await import("@/lib/ai-trends");

    await expect(getAiTrendBriefingSummaries()).resolves.toEqual([]);
    await expect(
      getAiTrendBriefingByDateSlug("2026-09-19"),
    ).resolves.toBeNull();
    await expect(
      getLatestPublishedAiTrendBriefingWithVideo(),
    ).resolves.toBeNull();

    expect(db.findMany).not.toHaveBeenCalled();
    expect(db.findFirst).not.toHaveBeenCalled();
  });

  it.each([
    ["zh", "AI 趋势内容尚未核验"],
    ["en", "AI Trends content has not been verified"],
  ] as const)(
    "renders a safe DB-free %s topic page",
    async (locale, expectedText) => {
      const { AiTrendTopicPageShell, generateAiTrendTopicMetadata } =
        await import("@/app/ai-trends/page-shell");

      const html = renderToStaticMarkup(
        await AiTrendTopicPageShell({ forceLocale: locale }),
      );
      const metadata = generateAiTrendTopicMetadata(locale);

      expect(html).toContain('data-content-status="UNVERIFIED"');
      expect(html).toContain("UNVERIFIED");
      expect(html).toContain(expectedText);
      expect(html).not.toContain("CollectionPage");
      expect(html).not.toContain("FAQPage");
      expect(html).not.toContain("AI demand trends");
      expect(html).not.toContain("Google Trends");
      expect(html).not.toContain(locale === "en" ? "Demand heat ranking" : "需求热度排行");
      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(db.findMany).not.toHaveBeenCalled();
      expect(db.findFirst).not.toHaveBeenCalled();
    },
  );

  it("preserves configured database reads and indexable metadata", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
    const {
      getAiTrendBriefingByDateSlug,
      getAiTrendBriefingSummaries,
      getLatestPublishedAiTrendBriefingWithVideo,
    } = await import("@/lib/ai-trends");
    const { generateAiTrendTopicMetadata } = await import(
      "@/app/ai-trends/page-shell"
    );

    await expect(getAiTrendBriefingSummaries()).resolves.toEqual([]);
    await expect(
      getAiTrendBriefingByDateSlug("2026-09-19"),
    ).resolves.toBeNull();
    await expect(
      getLatestPublishedAiTrendBriefingWithVideo(),
    ).resolves.toBeNull();

    expect(db.findMany).toHaveBeenCalledOnce();
    expect(db.findFirst).toHaveBeenCalledTimes(2);
    expect(generateAiTrendTopicMetadata("en").robots).toEqual({
      index: true,
      follow: true,
    });
  });
});
