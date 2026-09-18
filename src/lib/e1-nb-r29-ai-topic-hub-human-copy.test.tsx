import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { aiTopicClusterSlugs } from "@/lib/ai-topic-clusters";

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

const sourcePath = join(process.cwd(), "src/app/ai-topics/page-shell.tsx");

describe("E1-NB-R29 AI Topic Hub human-facing answer copy", () => {
  it("removes machine-facing answer copy from the source", () => {
    const source = readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("可摘录答案");
    expect(source).not.toContain("Direct answer");
    expect(source).not.toContain("AI 回答引擎");
    expect(source).not.toContain("AI answer engines");
    expect(source).toContain("核心结论");
    expect(source).toContain("Key takeaway");
  });

  it.each([
    ["zh", "核心结论", "可摘录答案"],
    ["en", "Key takeaway", "Direct answer"],
  ] as const)(
    "renders the %s detail label for people",
    async (locale, expectedLabel, oldLabel) => {
      const { AiTopicDetailPageShell } = await import(
        "@/app/ai-topics/page-shell"
      );
      const html = renderToStaticMarkup(
        <AiTopicDetailPageShell
          slug={aiTopicClusterSlugs[0]}
          forceLocale={locale}
        />,
      );

      expect(html).toContain(`>${expectedLabel}</h2>`);
      expect(html).not.toContain(oldLabel);
    },
  );

  it.each([
    ["zh", "先学什么、试什么、继续查看什么"],
    ["en", "what to learn, try, or explore next"],
  ] as const)(
    "renders %s hub guidance around user decisions",
    async (locale, expectedGuidance) => {
      const { AiTopicsHubPageShell } = await import(
        "@/app/ai-topics/page-shell"
      );
      const html = renderToStaticMarkup(
        <AiTopicsHubPageShell forceLocale={locale} />,
      );

      expect(html).toContain(expectedGuidance);
      expect(html).not.toContain("可摘录答案");
      expect(html).not.toContain("direct answers");
      expect(html).not.toContain("回答引擎");
      expect(html).not.toContain("answer engines");
    },
  );
});
