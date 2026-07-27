import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("product demo motion enhancement source contract", () => {
  it("keeps crawlable category links while enhancing filters with GSAP Flip and browser history", () => {
    const listing = readFileSync(new URL("../app/product-demos/page-shell.tsx", import.meta.url), "utf8");
    const filterGrid = readFileSync(
      new URL("../components/product-demo-filter-grid.tsx", import.meta.url),
      "utf8",
    );
    const gsapRuntime = readFileSync(new URL("./gsap-runtime.ts", import.meta.url), "utf8");

    expect(listing).toContain("ProductDemoFilterGrid");
    expect(listing).toContain("getPublicProductDemos(activeCategory)");
    expect(listing).not.toContain('getPublicProductDemos("all")');
    expect(filterGrid).toContain('import Link from "next/link"');
    expect(filterGrid).toContain("href={filter.href}");
    expect(filterGrid).toContain('aria-current={filter.value === activeCategory ? "page" : undefined}');
    expect(filterGrid).toContain("loadGsapFlip");
    expect(filterGrid).toContain("runtimeRef.current = null");
    expect(filterGrid).toContain(".catch(() => {");
    expect(filterGrid).not.toContain('from "gsap"');
    expect(filterGrid).not.toContain('from "gsap/Flip"');
    expect(gsapRuntime).toContain('import("gsap")');
    expect(gsapRuntime).toContain('import("gsap/Flip")');
    expect(gsapRuntime).toContain("registerPlugin(Flip)");
    expect(filterGrid).toContain("Flip.getState");
    expect(filterGrid).toContain("Flip.from");
    expect(filterGrid).toContain("scroll={false}");
    expect(filterGrid).not.toContain("window.history.pushState");
    expect(filterGrid).toContain('window.addEventListener("popstate"');
    expect(filterGrid).toContain("prefers-reduced-motion: reduce");
    expect(filterGrid).toContain("(hover: hover) and (pointer: fine)");
    expect(filterGrid).toContain("activeFlipRef.current?.kill()");
  });

  it("uses a restrained card timeline only for fine pointers without reduced motion", () => {
    const card = readFileSync(new URL("../components/product-demo-card.tsx", import.meta.url), "utf8");
    const motionCard = readFileSync(
      new URL("../components/product-demo-motion-card.tsx", import.meta.url),
      "utf8",
    );
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(card).toContain("ProductDemoMotionCard");
    expect(motionCard).toContain("loadGsap");
    expect(motionCard).toContain(".catch(() => {");
    expect(motionCard).not.toContain('from "gsap"');
    expect(motionCard).toContain("gsap.timeline");
    expect(motionCard).toContain("prefers-reduced-motion: no-preference");
    expect(motionCard).toContain("(hover: hover) and (pointer: fine)");
    expect(motionCard).toContain("timeline.kill()");
    expect(motionCard).toContain("media.revert()");
    expect(css).not.toContain(".product-demo-card:hover .product-demo-card-media img");
  });

  it("does not add GSAP animation to the homepage Hero", () => {
    const home = readFileSync(new URL("../app/page-shell.tsx", import.meta.url), "utf8");

    expect(home).not.toContain('from "gsap"');
    expect(home).not.toContain('from "gsap/Flip"');
    expect(home).not.toContain("gsap.timeline");
    expect(home).not.toContain("Flip.from");
  });
});
