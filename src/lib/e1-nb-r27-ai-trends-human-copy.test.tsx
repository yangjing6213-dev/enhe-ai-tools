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
});
