import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const srcRoot = join(process.cwd(), "src");

function readCandidate(relativePath: string) {
  const path = join(srcRoot, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("AI tools candidate responsive browsing", () => {
  it("keeps the approved grid breakpoints and mobile rail CSS contract", () => {
    const css = readCandidate("styles/redesign/software.css");

    expect(css).toMatch(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
    expect(css).toMatch(/max-width:\s*1024px/);
    expect(css).toMatch(/max-width:\s*768px/);
    expect(css).toMatch(/max-width:\s*767px/);
    expect(css).toContain("overflow-x: auto");
    expect(css).toContain("scroll-snap-type: x mandatory");
    expect(css).toContain("scroll-snap-align: start");
    expect(css).toContain("gap: 18px");
    expect(css).toContain("flex: 0 0 80vw");
    expect(css).toContain("flex: 0 0 84vw");
    expect(css).toContain("grid-template-columns: 1fr");
    expect(css).toContain("scroll-padding-inline");
    expect(css).toContain("min-width: 0");
    expect(css).toContain("--redesign-software-mobile-page-padding: 20px");
    expect(css).toContain("padding-inline: var(--redesign-software-mobile-page-padding)");
    expect(css).toContain("width: 100vw");
    expect(css).toContain("margin-inline: calc(50% - 50vw)");
  });

  it("uses the rail only for new releases and featured products", () => {
    const catalog = readCandidate("components/redesign/software/EnheRedesignSoftwareCatalog.tsx");

    expect(catalog).toContain("EnheRedesignSoftwareRail");
    expect(catalog).toContain('data-horizontal-cards="new"');
    expect(catalog).toContain('data-horizontal-cards="featured"');
    expect(catalog).not.toContain('data-horizontal-cards="all"');
  });

  it("keeps the rail keyboard-focusable without timers or automatic motion", () => {
    const rail = readCandidate("components/redesign/software/EnheRedesignSoftwareRail.tsx");

    expect(rail).toContain('"use client"');
    expect(rail).toContain("tabIndex={0}");
    expect(rail).toContain('role="region"');
    expect(rail).toContain("aria-label");
    expect(rail).toContain("ArrowLeft");
    expect(rail).toContain("ArrowRight");
    expect(rail).toContain("scrollBy");
    expect(rail).not.toContain("setInterval");
    expect(rail).not.toContain("setTimeout");
    expect(rail).not.toContain("requestAnimationFrame");
  });

  it("does not hide or disable the intended rail overflow at document level", () => {
    const css = readCandidate("styles/redesign/software.css");

    expect(css).not.toMatch(/overflow-x:\s*hidden/);
  });
});
