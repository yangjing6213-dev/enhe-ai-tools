import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HOME_PRODUCT_COUNT,
  HOME_PRODUCT_DEFAULT_INDEX,
  HOME_PRODUCTS,
} from "@/lib/redesign/home/home-products";

const showcaseSource = readFileSync(
  join(process.cwd(), "src/components/redesign/home/EnheRedesignProductShowcase.tsx"),
  "utf8",
);

describe("homepage approved product showcase", () => {
  it("keeps the five approved products in the prototype order", () => {
    expect(HOME_PRODUCT_COUNT).toBe(5);
    expect(HOME_PRODUCT_DEFAULT_INDEX).toBe(0);
    expect(HOME_PRODUCTS.map((product) => product.id)).toEqual([
      "ultimate-edition",
      "infinitetalk",
      "ai-voice",
      "lumi-os",
      "faceswap-studio",
    ]);
    expect(HOME_PRODUCTS).toHaveLength(5);
  });

  it("keeps bilingual content, public links, and fixed media dimensions", () => {
    expect(HOME_PRODUCTS[0]).toMatchObject({
      mediaSrc: "/redesign/home/ultimate-edition.png",
      width: 1672,
      height: 941,
      name: {
        zh: "无所不能版｜AI生成视频应用",
        en: "Ultimate Edition | AI Video Generation Suite",
      },
      detailHref: {
        zh: "https://www.enhe-tech.com.cn/software/ultimate-edition-ai-video-generation-suite",
        en: "https://www.enhe-tech.com.cn/en/software/ultimate-edition-ai-video-generation-suite",
      },
    });
    expect(HOME_PRODUCTS[2]).toMatchObject({
      mediaSrc: "/redesign/home/ai-voice.png",
      name: { zh: "AI语音生成", en: "Local AI Voice Generator" },
      alt: { zh: "AI语音生成公开产品封面", en: "Public cover for Local AI Voice Generator" },
    });
    expect(HOME_PRODUCTS.every((product) => product.mediaSrc.startsWith("/redesign/home/"))).toBe(true);
    expect(HOME_PRODUCTS.every((product) => product.width === 1672 && product.height === 941)).toBe(true);
    expect(HOME_PRODUCTS.every((product) => product.description.zh && product.description.en)).toBe(true);
  });

  it("keeps the showcase manual, keyboard accessible, and single-index driven", () => {
    expect(showcaseSource).toContain('"use client"');
    expect(showcaseSource).toContain("ArrowLeft");
    expect(showcaseSource).toContain("ArrowRight");
    expect(showcaseSource).toContain("tabIndex={0}");
    expect(showcaseSource).toContain("onKeyDown");
    expect(showcaseSource).toContain("HOME_PRODUCTS[index]");
    expect(showcaseSource).toContain("role=\"status\"");
    expect(showcaseSource).toContain("onError");
    expect(showcaseSource).not.toMatch(/setInterval|setTimeout|autoplay|Audio\(|fetch\(|prisma|database|delivery/i);
  });
});
