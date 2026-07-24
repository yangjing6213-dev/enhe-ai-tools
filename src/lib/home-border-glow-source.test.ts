import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  try {
    return readFileSync(new URL(relativePath, import.meta.url), "utf8").replace(/\r\n/g, "\n");
  } catch {
    return "";
  }
}

describe("homepage BorderGlow source contract", () => {
  it("keeps BorderGlow on only the primary hero CTA after the category menu upgrade", () => {
    const page = readSource("../app/page-shell.tsx");

    expect(page).toContain('import BorderGlow from "@/components/home/border-glow";');
    expect(page.match(/variant="button"/g)).toHaveLength(1);
    expect(page).not.toContain("homeProductPaths[forceLocale].map((item, index)");
    expect(page.match(/variant="card"/g)).toBeNull();
    expect(page).not.toContain("<FlowingMenu");
    expect(page).toContain('className="home-task-outcomes-shell"');
    expect(page).toMatch(/<ButtonLink\s+href=\{buildLocalePath\("\/software", forceLocale\)\}/);
    expect(page).toContain('className="home-hero-secondary-link"');
    expect(page).toContain('data-analytics-event="home_tool_finder_cta_click"');
    expect(page).toContain('data-analytics-event="home_practical_ai_learning_click"');
    expect(page).toContain('forceLocale === "en" ? "Find the right AI tool" : "选择适合AI的工具"');
    expect(page).toContain('forceLocale === "en" ? "Explore practical AI learning" : "查看 AI 实战学习路径"');
  });

  it("keeps the React Bits interaction local, cancellable, and accessible", () => {
    const component = readSource("../components/home/border-glow.tsx");

    expect(component).toContain('"use client";');
    expect(component).toContain("Adapted from React Bits BorderGlow");
    expect(component).toContain('variant: "button" | "card"');
    expect(component).toContain("getEdgeProximity");
    expect(component).toContain("getCursorAngle");
    expect(component).toContain("requestAnimationFrame");
    expect(component).toContain("cancelAnimationFrame");
    expect(component).toContain('window.matchMedia("(pointer: coarse)")');
    expect(component).toContain('window.matchMedia("(prefers-reduced-motion: reduce)")');
    expect(component).toMatch(/if \(!animated \|\| !card \|\| coarsePointer\.matches \|\| reducedMotion\.matches\)/);
    expect(component).toContain("onPointerMove={handlePointerMove}");
    expect(component).toContain("onPointerLeave={handlePointerLeave}");
    expect(component).toContain('aria-hidden="true"');
    expect(component).not.toContain('document.addEventListener("pointermove"');
  });

  it("scopes the visual treatment and retains static mobile and reduced-motion borders", () => {
    const css = readSource("../components/home/border-glow.module.css");

    expect(css).toContain(".card {");
    expect(css).toContain(".button {");
    expect(css).toContain(".demandCard {");
    expect(css).toContain(".inner {");
    expect(css).toContain("overflow: hidden");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain("@media (pointer: coarse)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("transform: translateY(-2px)");
    expect(css).not.toContain("overflow: auto");
  });
});
