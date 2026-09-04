import { describe, expect, it } from "vitest";
import {
  buildHomeMetadataTitle,
  buildMetaDescription,
  buildMetadataTitle,
  buildPageMetadata,
  buildToolMetaDescription,
  buildToolMetadataTitle
} from "@/lib/seo";

describe("seo helpers", () => {
  it("normalizes and truncates metadata descriptions", () => {
    expect(buildMetaDescription("  AI \n helper    for teams  ", "fallback", 17)).toBe("AI helper for");
    expect(buildMetaDescription("   ", "fallback")).toBe("fallback");
    expect(
      buildMetaDescription(
        "AI tools... help teams coordinate research, writing, and review workflows.",
        "fallback",
        48,
      ),
    ).not.toMatch(/\.{3}|…/);
  });

  it("keeps public page metadata descriptions concise", () => {
    const metadata = buildPageMetadata({
      title: "AI Software Apps",
      description:
        "Explore AI software apps for local deployment, productivity workflows, content creation, automation, audio, video, and daily work. Compare features, pricing, and access.",
      path: "/software",
      locale: "en_US",
      localeKey: "en"
    });

    expect(String(metadata.description).length).toBeLessThanOrEqual(150);
  });

  it("builds page titles without duplicating the brand", () => {
    expect(buildMetadataTitle({ pageTitle: "ENHE AI", brand: "ENHE AI" })).toBe("ENHE AI");
    expect(buildMetadataTitle({ pageTitle: "ENHE AI", brand: "Symbiosis ENHE AI" })).toBe("Symbiosis ENHE AI");
    expect(buildMetadataTitle({ pageTitle: "AI Software Apps", brand: "ENHE AI" })).toBe("AI Software Apps | ENHE AI");
    expect(buildMetadataTitle({ pageTitle: "AI Software Apps | ENHE AI", brand: "ENHE AI" })).toBe("AI Software Apps | ENHE AI");
  });

  it("builds locale-aware tool titles without duplicate names", () => {
    expect(buildToolMetadataTitle({ name: "Symbiosis", englishName: "Symbiosis", brand: "ENHE AI" })).toBe(
      "Symbiosis | ENHE AI"
    );
    expect(buildToolMetadataTitle({ name: "即梦AI", englishName: "Dreamina", brand: "ENHE AI", locale: "zh" })).toBe(
      "即梦AI (Dreamina) | ENHE AI"
    );
    expect(buildToolMetadataTitle({ name: "Dreamina - AI Software App", englishName: null, brand: "ENHE AI", locale: "en" })).toBe(
      "Dreamina | AI Software App | ENHE AI"
    );

    const longTitle = buildToolMetadataTitle({
      name: "A very long product name for creators and operators",
      englishName: "Another descriptive English subtitle",
      brand: "ENHE AI",
      locale: "en",
      maxLength: 42
    });

    expect(longTitle.endsWith(" | ENHE AI")).toBe(true);
    expect(longTitle.length).toBeLessThanOrEqual(42);
    expect(longTitle).not.toContain("·");
    expect(longTitle).not.toContain("...");

    const longZhTitle = buildToolMetadataTitle({
      name: "A very long product name for creators and operators",
      englishName: "Another descriptive English subtitle",
      brand: "Symbiosis ENHE AI",
      locale: "zh",
      maxLength: 42
    });

    expect(longZhTitle.endsWith(" | Symbiosis ENHE AI")).toBe(true);
    expect(longZhTitle.length).toBeLessThanOrEqual(42);
    expect(longZhTitle).not.toContain("(");
  });

  it("builds locale-aware tool descriptions for detail pages", () => {
    const englishDescription = buildToolMetaDescription({
      name: "Dreamina",
      englishName: null,
      description: "Dreamina is an AI software app for image and video creation. Review pricing, tutorials, and access guidance on ENHE AI.",
      brand: "ENHE AI",
      locale: "en",
      type: "software"
    });

    expect(englishDescription).toBe(
      "Dreamina is an AI software app for image and video creation. Review pricing, tutorials, and access guidance on ENHE AI."
    );
    expect(englishDescription.length).toBeLessThanOrEqual(140);

    const chineseDescription = buildToolMetaDescription({
      name: "即梦AI",
      englishName: "Dreamina",
      description: "  一款用于生成图片和视频的 AI 创作工具。  ",
      brand: "ENHE AI",
      locale: "zh",
      type: "software"
    });

    expect(chineseDescription.startsWith("一款用于生成图片和视频的 AI 创作工具。")).toBe(true);
    expect(chineseDescription).toContain("ENHE AI");
    expect(chineseDescription.length).toBeLessThanOrEqual(160);
  });

  it("builds homepage titles as brand plus business scope", () => {
    expect(buildHomeMetadataTitle("en", "ENHE AI")).toBe("ENHE AI | AI News, Apps, Accounts & Courses");
    expect(buildHomeMetadataTitle("zh", "恩禾 ENHE AI")).toBe(
      "恩禾 ENHE AI | 让 AI 真正为每个人所用，把复杂变简单，把效率变价值。",
    );
  });
});
