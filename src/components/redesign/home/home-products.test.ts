import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  EnheRedesignProductShowcase,
  getWrappedProductIndex,
  updateProductMediaState,
} from "@/components/redesign/home/EnheRedesignProductShowcase";
import {
  HOME_PRODUCT_COUNT,
  HOME_PRODUCT_DEFAULT_INDEX,
  HOME_PRODUCTS,
} from "@/lib/redesign/home/home-products";
import { createDefaultHomeProductShowcase } from "@/lib/redesign/home/home-product-showcase";

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

Object.assign(globalThis, { React });

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
    expect(getWrappedProductIndex(1, 1, 3)).toBe(2);
    expect(getWrappedProductIndex(0, -1, 0)).toBe(0);
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

  it.each([
    ["zh", "查看产品"],
    ["en", "View product"],
  ] as const)("renders all approved %s product content in a semantic no-script fallback", (locale, cta) => {
    const html = renderToStaticMarkup(
      createElement(EnheRedesignProductShowcase, { locale }),
    );
    const fallback = html.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? "";

    expect(fallback).toContain("<ol");
    expect(fallback.match(/<li\b/g) ?? []).toHaveLength(HOME_PRODUCT_COUNT);
    expect(fallback.match(/<h3\b/g) ?? []).toHaveLength(HOME_PRODUCT_COUNT);
    expect(fallback.match(/<a\b/g) ?? []).toHaveLength(HOME_PRODUCT_COUNT);

    for (const product of HOME_PRODUCTS) {
      expect(fallback).toContain(`data-product-id="${product.id}"`);
      expect(fallback).toContain(`<h3>${product.name[locale]}</h3>`);
      expect(fallback).toContain(`<p>${product.description[locale]}</p>`);
      expect(fallback).toContain(`href="${product.detailHref[locale]}"`);
      expect(fallback).toContain(`>${cta}</a>`);
      expect(fallback).not.toContain(product.mediaSrc);
    }

    expect(fallback).not.toContain("<img");
  });

  it("renders an uploaded video when a featured card is configured as video", () => {
    const products = createDefaultHomeProductShowcase().slice(0, 1).map((product) => ({
      ...product,
      mediaType: "video" as const,
      mediaSrc: "cos://bucket/tool-videos/home/demo.mp4",
    }));
    const html = renderToStaticMarkup(createElement(EnheRedesignProductShowcase, { locale: "zh", products }));

    expect(html).toContain("<video");
    expect(html).toContain(`src="/api/tool-videos?src=${encodeURIComponent(products[0].mediaSrc)}"`);
    expect(html).toContain('playsInline=""');
    expect(html.match(/<li\b/g) ?? []).toHaveLength(1);
  });

  it("defers the bundled cover and provides responsive optimized sources", () => {
    const html = renderToStaticMarkup(createElement(EnheRedesignProductShowcase, { locale: "zh" }));
    const image = html.match(/<img\b[^>]*>/)?.[0] ?? "";

    expect(image).toContain('loading="lazy"');
    expect(image).toContain('srcSet="/_next/image?');
    expect(image).toContain('sizes="(max-width: 767px)');
    expect(image).toContain(encodeURIComponent(HOME_PRODUCTS[0].mediaSrc));
    expect(html).not.toContain('rel="preload"');
  });

  it.each([
    "https://media.example/cover.png",
    "/api/tool-images?id=tool-1",
    "/redesign/home/../../api/private/cover.png",
  ])("keeps configured non-bundled media outside the optimizer: %s", (mediaSrc) => {
    const products = [{ ...createDefaultHomeProductShowcase()[0], mediaSrc }];
    const html = renderToStaticMarkup(createElement(EnheRedesignProductShowcase, { locale: "zh", products }));
    const image = html.match(/<img\b[^>]*>/)?.[0] ?? "";

    expect(image).toContain(`src="${mediaSrc}"`);
    expect(image).toContain('loading="lazy"');
    expect(image).not.toContain("/_next/image?");
    expect(image).not.toContain("srcSet=");
  });

  it("keeps manual selection keyboard accessible alongside product autoplay", () => {
    expect(showcaseSource).toContain('"use client"');
    expect(showcaseSource).toContain("ArrowLeft");
    expect(showcaseSource).toContain("ArrowRight");
    expect(showcaseSource).toContain("tabIndex={0}");
    expect(showcaseSource).toContain("onKeyDown");
    expect(showcaseSource).toContain("products[currentIndex]");
    expect(showcaseSource).toContain("role=\"status\"");
    expect(showcaseSource).toContain("role=\"region\"");
    expect(showcaseSource).toContain("key={product.id}");
    expect(showcaseSource).toContain('from \"next/image\"');
    expect(showcaseSource).toContain('loading=\"lazy\"');
    expect(showcaseSource).toContain('unoptimized');
    expect(showcaseSource).toContain("setMediaState");
    expect(showcaseSource).toContain("onError");
    expect(showcaseSource).toContain("product.mediaType === \"video\"");
    expect(showcaseSource).toContain("playsInline");
    expect(showcaseSource).not.toMatch(/setInterval|Audio\(|fetch\(|prisma|database|delivery/i);
  });

  it("reduces the featured display to about three quarters while keeping its controls", () => {
    expect(homeStyles).toMatch(
      /--redesign-home-product-showcase-width:\s*calc\(75% - clamp\(66px, 9vw, 120px\)\)/,
    );
    expect(homeStyles).toMatch(
      /\.redesign-home-product-content\s*\{[\s\S]*?width:\s*var\(--redesign-home-product-showcase-width\)/,
    );
    expect(homeStyles).toMatch(/\.redesign-home-product-control:first-of-type/);
    expect(homeStyles).toMatch(/\.redesign-home-product-control:last-of-type/);
    expect(showcaseSource).toContain("ArrowLeft");
    expect(showcaseSource).toContain("ArrowRight");
    expect(showcaseSource).toContain("selectProduct");
  });

  it("removes the showcase frame and slide animations", () => {
    const mediaFrame = homeStyles.match(
      /\.redesign-home-product-media-frame\s*\{([^}]*)\}/,
    )?.[1] ?? "";

    expect(mediaFrame).not.toMatch(/border\s*:/);
    expect(mediaFrame).not.toMatch(/box-shadow\s*:/);
    expect(mediaFrame).not.toMatch(/transition\s*:/);
    expect(showcaseSource).not.toContain('from "motion/react"');
    expect(showcaseSource).not.toContain("data-motion-variant");
  });

  it("renders one accessible indicator for each featured product", () => {
    const html = renderToStaticMarkup(createElement(EnheRedesignProductShowcase, { locale: "zh" }));
    expect(html).toContain('aria-label="选择推荐产品"');
    expect(html.match(/aria-label="显示第 \d 款产品"/g) ?? []).toHaveLength(HOME_PRODUCT_COUNT);
    expect(html).toContain('aria-current="true"');
  });

  it("keeps product detail links touchable and mobile controls beside the card", () => {
    const mobileStyles = homeStyles.slice(homeStyles.lastIndexOf("@media (width < 768px)"));

    expect(homeStyles).toMatch(
      /\.redesign-home-product-detail a\s*\{[\s\S]*?min-height:\s*44px[\s\S]*?display:\s*inline-flex[\s\S]*?align-items:\s*center[\s\S]*?padding:/,
    );
    expect(homeStyles).toMatch(/\.redesign-home-product-control\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*50%/);
    expect(mobileStyles).toMatch(/\.redesign-home-product-stage\s*\{[\s\S]*?--redesign-home-product-showcase-width:\s*calc\(75% - 60px\)/);
    expect(mobileStyles).toMatch(/\.redesign-home-product-content\s*\{[^}]*margin-inline:\s*auto/);
    expect(mobileStyles).toMatch(/\.redesign-home-product-control\s*\{[^}]*width:\s*32px/);
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
