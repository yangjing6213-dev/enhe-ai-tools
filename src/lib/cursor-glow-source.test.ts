import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("global cursor glow source contract", () => {
  it("mounts the cursor glow and React Bits target cursor from the shared root document", () => {
    const layoutSource = readFileSync(new URL("../app/root-layout-shared.tsx", import.meta.url), "utf8");

    expect(layoutSource).toContain('import { CursorGlow } from "@/components/cursor-glow";');
    expect(layoutSource).toContain('import { TargetCursor } from "@/components/target-cursor";');
    expect(layoutSource).toContain("<CursorGlow />");
    expect(layoutSource).toContain('<TargetCursor cursorColorOnTarget="var(--marketing-accent)" />');
  });

  it("defines cursor glow and target cursor styling with accessibility guards in globals.css", () => {
    const cssSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

    expect(cssSource).toContain(".cursor-glow-shell");
    expect(cssSource).toContain(".cursor-glow-orb");
    expect(cssSource).toContain(".target-cursor-wrapper");
    expect(cssSource).toContain(".target-cursor-corner");
    expect(cssSource).toContain("@media (pointer: coarse)");
    expect(cssSource).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps React Bits TargetCursor defaults and target class contract intact", () => {
    const cursorSource = readFileSync(new URL("../components/target-cursor.tsx", import.meta.url), "utf8");
    const uiSource = readFileSync(new URL("../components/ui.tsx", import.meta.url), "utf8");
    const headerSource = readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8");
    const footerSource = readFileSync(new URL("../components/site-footer.tsx", import.meta.url), "utf8");

    expect(cursorSource).toContain('targetSelector = ".cursor-target"');
    expect(cursorSource).toContain("spinDuration = 2");
    expect(cursorSource).toContain("hideDefaultCursor = true");
    expect(cursorSource).toContain("hoverDuration = 0.2");
    expect(cursorSource).toContain("parallaxOn = true");
    expect(cursorSource).toContain('window.matchMedia("(pointer: coarse)").matches');
    expect(cursorSource).toContain('window.matchMedia("(prefers-reduced-motion: reduce)").matches');

    for (const source of [uiSource, headerSource, footerSource]) {
      expect(source).toContain("cursor-target");
    }
  });
});
