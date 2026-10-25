import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getWrappedProductIndex } from "@/components/redesign/home/EnheRedesignProductShowcase";

const component = readFileSync(
  join(process.cwd(), "src/components/redesign/home/EnheRedesignProductShowcase.tsx"),
  "utf8",
);
const styles = readFileSync(join(process.cwd(), "src/styles/redesign/home.css"), "utf8");

describe("homepage featured products without display effects", () => {
  it("shrinks the showcase to three quarters of its previous display width", () => {
    expect(styles).toContain(
      "--redesign-home-product-showcase-width: calc(75% - clamp(66px, 9vw, 120px))",
    );
    expect(styles).toContain(
      "--redesign-home-product-showcase-width: calc(75% - 60px)",
    );
    expect(styles).toMatch(
      /\.redesign-home-product-content\s*\{[\s\S]*?width:\s*var\(--redesign-home-product-showcase-width\)/,
    );
  });

  it("removes the showcase frame and transition effects", () => {
    const frame = styles.match(/\.redesign-home-product-media-frame\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(frame).not.toMatch(/border\s*:/);
    expect(frame).not.toMatch(/box-shadow\s*:/);
    expect(frame).not.toMatch(/transition\s*:/);
    expect(styles).not.toMatch(/\.redesign-home-product-media-frame:hover\s*\{[\s\S]*?transform/);
    expect(component).not.toContain('from "motion/react"');
    expect(component).not.toContain("data-motion-variant");
    expect(component).not.toContain("useLayoutEffect");
  });

  it("keeps immediate manual, keyboard, and indicator switching", () => {
    expect(getWrappedProductIndex(0, -1)).toBe(4);
    expect(getWrappedProductIndex(4, 1)).toBe(0);
    expect(component).toContain('event.key === "ArrowLeft"');
    expect(component).toContain('event.key === "ArrowRight"');
    expect(component).toContain("selectProduct");
    expect(component).toContain("setIndex(nextIndex)");
    expect(component).toContain("setIndex(targetIndex)");
    expect(component).toContain("onClick={() => move(-1)}");
    expect(component).toContain("onClick={() => move(1)}");
  });

  it("keeps automatic switching paused while hidden, hovered, focused, or reduced-motion", () => {
    expect(component).toContain("const PRODUCT_AUTO_INTERVAL_MS = 6000");
    expect(component).toContain("window.setTimeout(() => move(1), PRODUCT_AUTO_INTERVAL_MS)");
    expect(component).toContain(
      "inView && pageVisible && !prefersReducedMotion && !hovered && !focused",
    );
  });
});
