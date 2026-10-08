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

    expect(css).toMatch(/\.redesign-software\s*\{[^}]*background-color:\s*var\(--enhe-page-bg\)/);
    expect(css).toMatch(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
    expect(css).toMatch(/max-width:\s*1024px/);
    expect(css).toMatch(/max-width:\s*768px/);
    expect(css).toMatch(/width\s*<\s*768px/);
    expect(css).not.toMatch(/max-width:\s*767px/);
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

  it("keeps primary and secondary catalogue controls at the locked 48px height", () => {
    const css = readCandidate("styles/redesign/software.css");

    expect(css).toMatch(
      /\.redesign-software-category-trigger,\s*\.redesign-software-load-more-button,\s*\.redesign-software-next-link\s*\{\s*min-height:\s*48px;/,
    );
    expect(css).toMatch(
      /\.redesign-software-category-button\s*\{[\s\S]*?min-height:\s*44px;/,
    );
  });

  it("uses the shared 48px button token for the primary card action", () => {
    const css = readCandidate("styles/redesign/software.css");

    expect(css).toMatch(
      /\.redesign-software-card-link\[data-support-exclusion\]\s*\{\s*min-height:\s*var\(--enhe-button-h,\s*48px\);/,
    );
  });

  it("wraps long card titles at arbitrary word boundaries", () => {
    const css = readCandidate("styles/redesign/software.css");
    const titleBlock = css.match(
      /\.redesign-software-card-body h3\s*\{([^}]*)\}/,
    )?.[1] ?? "";

    expect(titleBlock).toMatch(/overflow-wrap:\s*anywhere;/);
  });

  it("contains the mobile category sheet within the viewport box", () => {
    const css = readCandidate("styles/redesign/software.css");
    const mobilePanelBlock = css.match(
      /@media\s*\(width\s*<\s*768px\)[\s\S]*?\.redesign-software-category-panel\s*\{([^}]*)\}/,
    )?.[1] ?? "";

    expect(mobilePanelBlock).toMatch(/box-sizing:\s*border-box;/);
    expect(mobilePanelBlock).toMatch(/max-width:\s*100vw;/);
  });

  it("keeps catalogue controls on the locked focus ring and dark guard", () => {
    const css = readCandidate("styles/redesign/software.css");
    const focusBlock = css.match(
      /\.redesign-software-category-trigger:focus-visible,[\s\S]*?\.redesign-software-rail:focus-visible\s*\{([^}]*)\}/,
    )?.[1] ?? "";

    expect(focusBlock).toMatch(/outline:\s*3px solid var\(--enhe-focus,\s*#ffd60a\);/);
    expect(focusBlock).toMatch(/outline-offset:\s*4px;/);
    expect(focusBlock).toMatch(/box-shadow:\s*0 0 0 3px var\(--enhe-text,\s*#080808\);/);
  });

  it("keeps the category sheet close control on the same focus guard", () => {
    const css = readCandidate(
      "components/redesign/software/EnheRedesignSoftwareCategoryMotion.module.css",
    );

    expect(css).toMatch(
      /\.closeButton:focus-visible\s*\{[\s\S]*?outline:\s*3px solid var\(--enhe-focus,\s*#ffd60a\);[\s\S]*?outline-offset:\s*4px;[\s\S]*?box-shadow:\s*0 0 0 3px var\(--enhe-text,\s*#080808\);/,
    );
  });

  it("uses the rail only for new releases and featured products", () => {
    const catalog = readCandidate("components/redesign/software/EnheRedesignSoftwareCatalog.tsx");

    expect(catalog).toContain("EnheRedesignSoftwareRail");
    expect(catalog).toContain('rail="new"');
    expect(catalog).toContain('rail="featured"');
    expect(catalog).not.toContain('rail="all"');
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

  it("keeps the mobile sheet viewport-anchored outside transformed fade animation", () => {
    const css = readCandidate("styles/redesign/software.css");

    expect(css).toContain(
      ".enhe-redesign-production > .fade-in:has(.redesign-software)",
    );
    expect(css).toContain("animation-name: redesign-software-fade-in");
    expect(css).toMatch(
      /@keyframes redesign-software-fade-in\s*{[\s\S]*?opacity:\s*0[\s\S]*?opacity:\s*1[\s\S]*?}/,
    );
  });
});
