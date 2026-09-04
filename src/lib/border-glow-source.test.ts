import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("global card border glow source contract", () => {
  it("mounts the BorderGlow controller from the shared root document without touching public copy", () => {
    const layoutSource = readFileSync(new URL("../app/root-layout-shared.tsx", import.meta.url), "utf8");

    expect(layoutSource).toContain('import { BorderGlowController } from "@/components/border-glow-controller";');
    expect(layoutSource).toContain("<BorderGlowController />");
    expect(layoutSource).toContain("<AnalyticsTracker />");
  });

  it("keeps the React Bits BorderGlow edge and angle logic with the approved ENHE card targets", () => {
    const controllerSource = readFileSync(new URL("../components/border-glow-controller.tsx", import.meta.url), "utf8");

    expect(controllerSource).toContain("Adapted from React Bits BorderGlow");
    expect(controllerSource).toContain("const EDGE_SENSITIVITY = 30");
    expect(controllerSource).toContain('".glass"');
    expect(controllerSource).toContain('".surface-panel:not(.rounded-full)"');
    expect(controllerSource).toContain('".surface-panel-soft:not(.rounded-full)"');
    expect(controllerSource).toContain('".home-product-preview"');
    expect(controllerSource).toContain('".tool-detail-copy-card"');
    expect(controllerSource).toContain("getEdgeProximity");
    expect(controllerSource).toContain("getCursorAngle");
    expect(controllerSource).toContain('card.style.setProperty("--edge-proximity"');
    expect(controllerSource).toContain('card.style.setProperty("--cursor-angle"');
    expect(controllerSource).toContain('card.style.setProperty("--border-glow-strength"');
    expect(controllerSource).toContain('window.matchMedia("(pointer: coarse)")');
    expect(controllerSource).toContain('window.matchMedia("(prefers-reduced-motion: reduce)")');
  });

  it("defines the global card border glow layer with ENHE orange theme and accessibility fallbacks", () => {
    const cssSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/\r\n/g, "\n");

    expect(cssSource).toContain("--edge-proximity: 0");
    expect(cssSource).toContain("--cursor-angle: 110deg");
    expect(cssSource).toContain("--edge-sensitivity: 30");
    expect(cssSource).toContain("--cone-spread: 25deg");
    expect(cssSource).toContain("--glow-padding: 40px");
    expect(cssSource).toContain("--fill-opacity: 0.5");
    expect(cssSource).toContain("--glow-color: hsl(12deg 86% 58%");
    expect(cssSource).toContain("from calc(var(--cursor-angle) - var(--cone-spread))");
    expect(cssSource).toContain("mask-composite: exclude");
    expect(cssSource).toContain("@supports not ((mask-composite: exclude) or (-webkit-mask-composite: xor))");
    expect(cssSource).toContain("@media (pointer: coarse)");
    expect(cssSource).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
