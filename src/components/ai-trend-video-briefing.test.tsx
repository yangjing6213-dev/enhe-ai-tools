import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AiTrendVideoBriefing } from "./ai-trend-video-briefing";

Object.assign(globalThis, { React });
vi.mock("@/components/product-video-player", () => ({ ProductVideoPlayer: ({ title }: { title: string }) => <div data-video-title={title} /> }));

const props = { title: "What people want AI to solve", slug: "2026-10-18", coreConclusion: "Useful workflows first.", videoUrl: "/video.mp4", dailyHref: "/en/ai-trends/daily/2026-10-18" };

describe("localized AI trend video", () => {
  it("uses the localized briefing title instead of untranslated video-only fields in English", () => {
    const html = renderToStaticMarkup(<AiTrendVideoBriefing {...props} locale="en" videoTitle="AI趋势分析视频简报" videoDescription="中文视频摘要" />);
    expect(html).toContain("What people want AI to solve");
    expect(html).not.toContain("AI趋势分析视频简报");
    expect(html).not.toContain("中文视频摘要");
  });
  it("preserves supplied English video copy and the Chinese edition", () => {
    const en = renderToStaticMarkup(<AiTrendVideoBriefing {...props} locale="en" videoTitle="AI video briefing" videoDescription="A short video summary." />);
    expect(en).toContain("AI video briefing");
    expect(en).toContain("A short video summary.");
    const zh = renderToStaticMarkup(<AiTrendVideoBriefing {...props} locale="zh" videoTitle="AI趋势分析视频简报" videoDescription="中文视频摘要" />);
    expect(zh).toContain("AI趋势分析视频简报");
    expect(zh).toContain("中文视频摘要");
  });
});
