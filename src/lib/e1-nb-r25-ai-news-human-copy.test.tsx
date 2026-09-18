import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

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

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement("img", props),
}));

vi.mock("@/lib/public-content", () => ({
  getPublicAiNewsDiscovery: vi.fn(async () => ({
    keywordCloudItems: [],
    topicCollectionItems: [],
  })),
  getPublicAiNewsTopics: vi.fn(async () => []),
  getPublicNewsCategories: vi.fn(async () => []),
  getPublicNewsListing: vi.fn(async () => ({ articles: [], total: 0 })),
  getPublicNewsTags: vi.fn(async () => []),
}));

const sourcePath = join(process.cwd(), "src/app/ai-news/page-shell.tsx");

describe("E1-NB-R25 AI News human-facing answer labels", () => {
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
      const { AiNewsPageShell } = await import("@/app/ai-news/page-shell");
      const html = renderToStaticMarkup(
        await AiNewsPageShell({
          searchParams: Promise.resolve({}),
          forceLocale: locale,
        }),
      );

      expect(html).toContain(expectedLabel);
      expect(html).not.toContain(oldLabel);
      expect(html).not.toContain('data-content-status="UNVERIFIED"');
    },
  );
});
