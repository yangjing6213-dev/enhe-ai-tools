import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiNewsTopics } from "@/lib/ai-news-topics";

Object.assign(globalThis, { React });

const publicContent = vi.hoisted(() => ({
  getTopic: vi.fn(),
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
  filterAiNewsTopicArticles: vi.fn(() => []),
  getPublicAiNewsTopic: publicContent.getTopic,
  getPublicAiNewsTopicSlugs: vi.fn(async () => []),
  getPublicNewsListing: vi.fn(async () => ({ articles: [], total: 0 })),
}));

const sourcePath = join(
  process.cwd(),
  "src/app/ai-news/topics/[slug]/page-shell.tsx",
);

describe("E1-NB-R28 AI News Topic human-facing answer labels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
    publicContent.getTopic.mockResolvedValue(aiNewsTopics[0]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("removes machine-facing answer labels from the topic source", () => {
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
    "renders the %s configured-topic label for people",
    async (locale, expectedLabel, oldLabel) => {
      const { AiNewsTopicPageShell } = await import(
        "@/app/ai-news/topics/[slug]/page-shell"
      );
      const html = renderToStaticMarkup(
        await AiNewsTopicPageShell({
          slug: aiNewsTopics[0]!.slug,
          forceLocale: locale,
        }),
      );

      expect(html).toContain(`>${expectedLabel}</p>`);
      expect(html).not.toContain(oldLabel);
      expect(html).toContain(locale === "en" ? "What this topic means" : "这个专题对你有什么用");
    },
  );
});
