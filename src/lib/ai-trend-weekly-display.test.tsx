import React from "react";
import type { Prisma } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("not found"); },
  useRouter: () => ({ prefetch: vi.fn(), push: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, prefetch, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => {
    void prefetch;
    return <a {...props} href={String(href)}>{children}</a>;
  },
}));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn(async () => null) }));
vi.mock("@/lib/ai-trends", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai-trends")>();
  return {
    ...actual,
    getAiTrendBriefingSummaries: vi.fn(),
    getAiTrendBriefingByDateSlug: vi.fn(),
    localizeAiTrendBriefingView: vi.fn((view) => view),
  };
});

import { getAiTrendBriefingByDateSlug, getAiTrendBriefingSummaries, toAiTrendBriefingView } from "@/lib/ai-trends";
import { AiTrendDailyArchivePageShell, generateAiTrendDailyArchiveMetadata } from "@/app/ai-trends/daily/page-shell";
import { AiTrendDailyDetailPageShell, generateAiTrendDailyDetailMetadata } from "@/app/ai-trends/daily/[date]/page-shell";

const date = new Date("2026-10-27T00:00:00Z");
const briefing = {
  id: "weekly-evidence", date, slug: "2026-10-27", title: "Weekly source review", summary: "Reviewed sources",
  coreConclusion: "Test a small task first", publicHighlights: ["Source-backed observations"],
  fullHtml: "<p>Private full analysis</p>", status: "published", publishedAt: date,
  isIncludedInTopicPage: true, createdAt: date, updatedAt: date,
  videoUrl: null, videoTitle: null, videoDescription: null, videoPosterUrl: null, videoDurationSeconds: null,
  sourceSignals: {
    sources: [{ title: "Official update", url: "https://example.com/source", sourceType: "official", observedSignal: "Feature documented" }],
    demandBreakdowns: [{
      direction: "Productivity", summary: "Task guidance", heat: 97,
      scenarios: [97, 0].map((heat, index) => ({
        name: `Scenario ${index + 1}`, heat, urgency: "", typicalUsers: ["Creators"], painPoint: "Manual review",
        representativeScenarios: ["Check a draft"], aiValue: "Draft assistance", productOpportunity: "Guided demo",
        developmentPriority: "Try first", evidenceSignals: ["official"],
      })),
    }],
  } as Prisma.JsonValue,
} satisfies NonNullable<Awaited<ReturnType<typeof getAiTrendBriefingByDateSlug>>>;

describe("weekly briefing display without unsupported heat scores", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
    vi.mocked(getAiTrendBriefingByDateSlug).mockResolvedValue(briefing);
    vi.mocked(getAiTrendBriefingSummaries).mockResolvedValue([toAiTrendBriefingView(briefing, false)]);
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each(["zh", "en"] as const)("keeps %s archive cards and dates without numeric heat labels", async (locale) => {
    const html = renderToStaticMarkup(await AiTrendDailyArchivePageShell({ forceLocale: locale }));
    expect(html).toContain("Scenario 1");
    expect(html).toContain("Scenario 2");
    expect(html).toContain("Try first");
    expect(html).toContain("2026-10-27");
    expect(html).not.toMatch(/>97<|>0</);
    expect(html).toContain(locale === "zh" ? "每周趋势分析" : "Weekly Analysis");
    expect(generateAiTrendDailyArchiveMetadata(locale).robots).toEqual({ index: false, follow: true });
  });

  it.each(["zh", "en"] as const)("keeps %s detail analysis, sources, and login gate without claiming heat rankings", async (locale) => {
    const html = renderToStaticMarkup(await AiTrendDailyDetailPageShell({ date: "2026-10-27", forceLocale: locale }));
    expect(html).toContain("Productivity");
    expect(html).toContain("Scenario 1");
    expect(html).toContain("Scenario 2");
    expect(html).toContain("Official update");
    expect(html).toContain("Guided demo");
    expect(html).not.toMatch(/>97<|>0<|需求热度排行|demand heat rankings/);
    expect(html).not.toContain("Private full analysis");
    expect(html).toContain(locale === "zh" ? "细分场景分析" : "Scenario analysis");
    expect(generateAiTrendDailyDetailMetadata("2026-10-27", locale).robots).toEqual({ index: false, follow: true });
  });
});
