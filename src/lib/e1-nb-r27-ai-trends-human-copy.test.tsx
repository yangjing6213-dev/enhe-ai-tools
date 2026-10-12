import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

vi.mock("next/navigation", () => ({
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

vi.mock("@/lib/ai-trends", () => ({
  getAiTrendBriefingSummaries: vi.fn(async () => []),
  getLatestPublishedAiTrendBriefingWithVideo: vi.fn(async () => null),
  hasRenderableAiTrendVideo: vi.fn(() => false),
  localizeAiTrendBriefingView: vi.fn((briefing) => briefing),
}));

const sourcePath = join(process.cwd(), "src/app/ai-trends/page-shell.tsx");

describe("E1-NB-R27 AI Trends human-facing answer labels", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("removes machine-facing answer labels from the source", () => {
    const source = readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("可摘录答案");
    expect(source).not.toContain("Extractable answer");
    expect(source).toContain("核心结论");
    expect(source).toContain("Key takeaway");
  });

  it.each([
    ["zh", "核心结论", "可摘录答案"],
    ["en", "Key takeaway", "Extractable answer"],
  ] as const)(
    "renders the %s configured-content label for people",
    async (locale, expectedLabel, oldLabel) => {
      const { AiTrendTopicPageShell } = await import(
        "@/app/ai-trends/page-shell"
      );
      const html = renderToStaticMarkup(
        await AiTrendTopicPageShell({ forceLocale: locale }),
      );

      expect(html).toContain(`>${expectedLabel}</p>`);
      expect(html).not.toContain(oldLabel);
      expect(html).not.toContain('data-content-status="UNVERIFIED"');
    },
  );
  it.each(["zh", "en"] as const)("labels %s editorial context without unsupported numeric scores", async (locale) => {
    const { AiTrendTopicPageShell } = await import("@/app/ai-trends/page-shell");
    const html = renderToStaticMarkup(await AiTrendTopicPageShell({ forceLocale: locale }));
    expect(html).toContain('data-trend-evidence="editorial"');
    expect(html).toContain("2026-10-13");
    expect(html).toContain(locale === "zh" ? "不是实时统计排行" : "not a live statistical ranking");
    expect(html).not.toMatch(/>96<|>92<|width:96%|width:92%/);
    expect(html).not.toContain(locale === "zh" ? "需求热度排行" : "Demand heat ranking");
  });

});
