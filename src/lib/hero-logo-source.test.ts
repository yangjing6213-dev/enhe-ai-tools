import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("hero logo source", () => {
  it("keeps the homepage mark flat, level, and close to the accepted reference art", () => {
    const component = readFileSync(new URL("../components/hero-logo-mark.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(component).toContain("referenceHeroLogoCyan");
    expect(component).toContain("referenceHeroLogoWhite");
    expect(component).toContain("enhe-reference-logo-slat-top");
    expect(component).toContain("enhe-flat-logo-stem");
    expect(component).toContain('x="111" y="58" width="220"');
    expect(component).toContain('x="111" y="148" width="168"');
    expect(component).toContain('d="M381 58H449V292H381V202H329V148H381V58Z"');
    expect(component).not.toContain("enhe-flat-logo-lines");
    expect(component).not.toContain("enhe-flat-logo-scan");
    expect(component).not.toContain("enhe-logo-energy-line");
    expect(component).not.toContain("enhe-logo-node");
    expect(component).not.toContain("heroLogoDepthFill");
    expect(component).not.toContain("enhe-logo-depth");
    expect(css).toContain(".enhe-reference-logo-slat-top");
    expect(css).toContain("flat-logo-assemble");
    expect(css).toContain("aspect-ratio: 1.56;");
    expect(css).toContain("max-width: 72vw;");
    expect(css).not.toContain("left: 56%;");
    expect(css).not.toContain("orbit-drift");
    expect(css).not.toContain("rotate(5deg)");
    expect(css).not.toContain("rotate(-7deg)");
    expect(css).not.toContain("perspective:");
    expect(css).not.toContain("rotateX(");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation: none !important;");
  });
});
