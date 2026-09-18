import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

vi.mock("@/lib/public-content", () => ({
  getPublicTutorials: vi.fn(async () => []),
}));

import {
  generateTutorialsPageMetadata,
  TutorialsPageShell,
} from "@/app/tutorials/page-shell";
import { getPublicTutorials } from "@/lib/public-content";

const mockedTutorials = vi.mocked(getPublicTutorials);

const configuredTutorial = {
  id: "tutorial-preview",
  title: "中文教程标题",
  content: "中文教程内容",
  tool: {
    id: "tool-preview",
    slug: "tool-preview",
    name: "中文工具名称",
    englishName: "Preview Tool",
    type: "software" as const,
  },
};

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.DATABASE_URL;
});

describe("E1-NB-R16 tutorials DB-free UNVERIFIED preview parity", () => {
  it.each(["zh", "en"] as const)(
    "marks an empty DB-free tutorials page as UNVERIFIED (%s)",
    async (locale) => {
      delete process.env.DATABASE_URL;
      mockedTutorials.mockResolvedValueOnce([]);

      const html = renderToStaticMarkup(
        await TutorialsPageShell({ forceLocale: locale }),
      );

      expect(html).toContain('data-content-status="UNVERIFIED"');
      expect(html).toContain("UNVERIFIED");
      expect(html).not.toContain("<script");
      expect(html).not.toMatch(
        /\b(?:author|作者|published|发布日期|source|来源|price|价格|purchase|购买|download|下载)\b/i,
      );
      if (locale === "en") {
        expect(html).not.toMatch(/[\u3400-\u9fff]/);
        expect(html).toContain("English tutorial content is not available yet");
      } else {
        expect(html).toContain("教程内容尚未核验");
      }
    },
  );

  it("uses noindex-follow metadata for a DB-free tutorials preview", async () => {
    delete process.env.DATABASE_URL;

    const zhMetadata = await generateTutorialsPageMetadata("zh");
    const enMetadata = await generateTutorialsPageMetadata("en");

    expect(zhMetadata.robots).toEqual({ index: false, follow: true });
    expect(enMetadata.robots).toEqual({ index: false, follow: true });
    expect(enMetadata.description).toContain(
      "English tutorial content is not available in this local preview.",
    );
    expect(JSON.stringify(enMetadata)).not.toMatch(/[\u3400-\u9fff]/);
  });

  it("preserves configured tutorial cards and indexable metadata", async () => {
    process.env.DATABASE_URL = "postgresql://configured.invalid/enhe";
    mockedTutorials.mockResolvedValueOnce([configuredTutorial] as never);

    const html = renderToStaticMarkup(
      await TutorialsPageShell({ forceLocale: "zh" }),
    );
    const metadata = await generateTutorialsPageMetadata("zh");

    expect(html).toContain("中文教程标题");
    expect(html).not.toContain('data-content-status="UNVERIFIED"');
    expect(metadata.robots).toBeUndefined();
  });
});
