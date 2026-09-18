import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

vi.mock("@/lib/public-content", () => ({
  getPublicToolCategories: vi.fn(async () => []),
  getPublicToolListing: vi.fn(async () => []),
}));

vi.mock("@/components/prefetch-link", () => ({
  PrefetchLink: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement("a", props, children),
}));

import {
  generateSkillLearningPageMetadata,
  SkillLearningPageShell,
} from "@/app/skill-learning/page-shell";
import {
  getPublicToolCategories,
  getPublicToolListing,
} from "@/lib/public-content";

const mockedCategories = vi.mocked(getPublicToolCategories);
const mockedListing = vi.mocked(getPublicToolListing);

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.DATABASE_URL;
});

describe("E1-NB-R17 skill-learning DB-free UNVERIFIED preview parity", () => {
  it.each(["zh", "en"] as const)(
    "marks an empty DB-free skill-learning page as UNVERIFIED (%s)",
    async (locale) => {
      delete process.env.DATABASE_URL;
      mockedCategories.mockResolvedValueOnce([]);
      mockedListing.mockResolvedValueOnce([]);

      const html = renderToStaticMarkup(
        await SkillLearningPageShell({
          searchParams: Promise.resolve({}),
          forceLocale: locale,
        }),
      );

      expect(html).toContain('data-content-status="UNVERIFIED"');
      expect(html).toContain("UNVERIFIED");
      expect(html).not.toContain("ToolCard");
      if (locale === "en") {
        expect(html).not.toMatch(/[\u3400-\u9fff]/);
        expect(html).toContain("English skill-learning content is not available yet");
      } else {
        expect(html).toContain("技能学习内容尚未核验");
      }
    },
  );

  it("uses noindex-follow metadata for a DB-free skill-learning preview", async () => {
    delete process.env.DATABASE_URL;

    const zhMetadata = await generateSkillLearningPageMetadata(
      "zh",
      Promise.resolve({}),
    );
    const enMetadata = await generateSkillLearningPageMetadata(
      "en",
      Promise.resolve({}),
    );

    expect(zhMetadata.robots).toEqual({ index: false, follow: true });
    expect(enMetadata.robots).toEqual({ index: false, follow: true });
    expect(enMetadata.description).toContain(
      "English skill-learning content is not available in this local preview.",
    );
  });

  it("preserves configured skill-learning cards and indexable metadata", async () => {
    process.env.DATABASE_URL = "postgresql://configured.invalid/enhe";
    mockedCategories.mockResolvedValueOnce([]);
    mockedListing.mockResolvedValueOnce([
      {
        id: "skill-preview",
        name: "Verified Skill",
        englishName: "Verified Skill",
        slug: "verified-skill",
        type: "skill_learning",
        shortDescription: "A verified skill-learning course.",
        isVipRequired: false,
        downloadCount: 0,
        usageCount: 0,
      },
    ] as never);

    const html = renderToStaticMarkup(
      await SkillLearningPageShell({
        searchParams: Promise.resolve({}),
        forceLocale: "en",
      }),
    );
    const metadata = await generateSkillLearningPageMetadata(
      "en",
      Promise.resolve({}),
    );

    expect(html).not.toContain('data-content-status="UNVERIFIED"');
    expect(metadata.robots).toBeUndefined();
  });
});
