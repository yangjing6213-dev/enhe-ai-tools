import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getWrappedProductIndex,
  updateProductMediaState,
} from "@/components/redesign/home/EnheRedesignProductShowcase";
import {
  HOME_PRODUCT_COUNT,
  HOME_PRODUCT_DEFAULT_INDEX,
  HOME_PRODUCTS,
} from "@/lib/redesign/home/home-products";

const showcaseSource = readFileSync(
  join(process.cwd(), "src/components/redesign/home/EnheRedesignProductShowcase.tsx"),
  "utf8",
);
const homeStyles = readFileSync(join(process.cwd(), "src/styles/redesign/home.css"), "utf8");
const phaseOneMediaManifest = JSON.parse(
  readFileSync(
    join(process.cwd(), "docs/enhe-redesign/phase-1a/prototype/assets/product-media-manifest.json"),
    "utf8",
  ),
) as Array<{ localPath: string; sha256: string }>;

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

  it("wraps product navigation at both ends", () => {
    expect(getWrappedProductIndex(0, -1)).toBe(4);
    expect(getWrappedProductIndex(4, 1)).toBe(0);
  });

  it("updates media status by product ID without changing another product", () => {
    const state = {
      "ultimate-edition": "ready",
      infinitetalk: "loading",
      "ai-voice": "loading",
      "lumi-os": "loading",
      "faceswap-studio": "loading",
    } as const;

    const nextState = updateProductMediaState(state, "ultimate-edition", "error");

    expect(nextState["ultimate-edition"]).toBe("error");
    expect(nextState.infinitetalk).toBe("loading");
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

  it("keeps the showcase manual, keyboard accessible, and product-state driven", () => {
    expect(showcaseSource).toContain('"use client"');
    expect(showcaseSource).toContain("ArrowLeft");
    expect(showcaseSource).toContain("ArrowRight");
    expect(showcaseSource).toContain("tabIndex={0}");
    expect(showcaseSource).toContain("onKeyDown");
    expect(showcaseSource).toContain("HOME_PRODUCTS[index]");
    expect(showcaseSource).toContain("role=\"status\"");
    expect(showcaseSource).toContain("role=\"region\"");
    expect(showcaseSource).toContain("key={product.id}");
    expect(showcaseSource).toContain('from \"next/image\"');
    expect(showcaseSource).toContain('loading=\"eager\"');
    expect(showcaseSource).toContain('unoptimized');
    expect(showcaseSource).toContain("setMediaState");
    expect(showcaseSource).toContain("onError");
    expect(showcaseSource).not.toMatch(/setInterval|setTimeout|autoplay|Audio\(|fetch\(|prisma|database|delivery/i);
  });

  it("keeps product detail links touchable and mobile controls below full-width media", () => {
    const mobileStyles = homeStyles.slice(homeStyles.lastIndexOf("@media (max-width: 767px)"));

    expect(homeStyles).toMatch(
      /\.redesign-home-product-detail a\s*\{[\s\S]*?min-height:\s*44px[\s\S]*?display:\s*inline-flex[\s\S]*?align-items:\s*center[\s\S]*?padding:/,
    );
    expect(mobileStyles).toContain("grid-template-areas:");
    expect(mobileStyles).toContain('"content content content content"');
    expect(mobileStyles).toContain('". previous next ."');
  });

  it("keeps all five public media files present and matching the Phase 1A manifest", () => {
    expect(HOME_PRODUCTS).toHaveLength(5);

    for (const product of HOME_PRODUCTS) {
      const filename = basename(product.mediaSrc);
      const manifestEntry = phaseOneMediaManifest.find((entry) => basename(entry.localPath) === filename);
      const assetPath = join(process.cwd(), "public", product.mediaSrc.replace(/^\/+/, ""));

      expect(manifestEntry).toBeDefined();
      expect(existsSync(assetPath)).toBe(true);
      if (!manifestEntry) {
        throw new Error(`Missing Phase 1A manifest entry for ${filename}`);
      }
      expect(createHash("sha256").update(readFileSync(assetPath)).digest("hex").toUpperCase()).toBe(
        manifestEntry.sha256,
      );
    }
  });
});
