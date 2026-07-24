import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildProductPathHref,
  getProductPathConfig,
  productPathConfigs,
  productPathSlugs,
} from "@/lib/product-paths";
import { buildSoftwareCategoryHref } from "@/lib/software-category-navigation";

describe("homepage demand product paths", () => {
  it("renders database-backed product paths at request time", () => {
    const routeFiles = [
      "src/app/(zh-public)/product-paths/[slug]/page.tsx",
      "src/app/en/product-paths/[slug]/page.tsx",
    ];

    for (const routeFile of routeFiles) {
      const source = readFileSync(join(process.cwd(), routeFile), "utf8");

      expect(source).toContain('export const dynamic = "force-dynamic";');
      expect(source).not.toContain("generateStaticParams");
      expect(source).not.toContain("export const revalidate");
    }
  });

  it("defines the three product display pages with the requested Chinese titles and categories", () => {
    expect(productPathSlugs).toEqual([
      "work-efficiency",
      "media-generation",
      "future-ai",
    ]);

    expect(getProductPathConfig("work-efficiency")?.zh).toMatchObject({
      title: "提升工作效率",
      categories: ["AI办公与效率", "AI智能体"],
    });
    expect(getProductPathConfig("work-efficiency")?.categoryNames).toEqual([
      "AI办公与效率",
      "AI 智能体",
    ]);

    expect(getProductPathConfig("media-generation")?.zh).toMatchObject({
      title: "生成图片/视频/音频",
      categories: [
        "AI视频生成",
        "AI图片生成",
        "AI语音生成",
        "视频处理",
        "图片处理",
      ],
    });
    expect(getProductPathConfig("media-generation")?.categoryNames).toEqual([
      "AI视频生成",
      "AI图片生成",
      "AI语音生成",
      "视频处理",
      "图片处理",
    ]);

    expect(getProductPathConfig("future-ai")?.zh).toMatchObject({
      title: "改变你未来的AI",
      categories: [
        "AI 智能体",
        "生活实用AI工具",
        "智能体",
        "账号订购",
        "升级订阅",
        "AI 提示词",
        "AI 副业变现",
      ],
    });
  });

  it("builds localized internal links for the homepage cards", () => {
    expect(buildProductPathHref("work-efficiency", "zh")).toBe(
      "/product-paths/work-efficiency",
    );
    expect(buildProductPathHref("media-generation", "en")).toBe(
      "/en/product-paths/media-generation",
    );
    expect(buildProductPathHref("future-ai", "zh")).toBe(
      "/product-paths/future-ai",
    );
  });

  it("routes the productivity dropdown to the shared work-efficiency path", () => {
    expect(buildSoftwareCategoryHref("提升效率", "zh")).toBe(
      "/product-paths/work-efficiency",
    );
    expect(buildSoftwareCategoryHref("提升效率", "en")).toBe(
      "/en/product-paths/work-efficiency",
    );
    expect(buildSoftwareCategoryHref("视频生成", "zh")).toBe(
      "/software?categoryName=%E8%A7%86%E9%A2%91%E7%94%9F%E6%88%90",
    );
  });

  it("keeps product path metadata descriptions long enough for snippets", () => {
    for (const config of Object.values(productPathConfigs)) {
      expect(config.zh.metaDescription.length).toBeGreaterThanOrEqual(80);
      expect(config.zh.metaDescription.length).toBeLessThanOrEqual(150);
      expect(config.en.metaDescription.length).toBeGreaterThanOrEqual(120);
      expect(config.en.metaDescription.length).toBeLessThanOrEqual(160);
    }
  });
});
