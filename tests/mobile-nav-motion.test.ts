import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveMobileNavMotion } from "@/lib/motion/mobile-nav-motion";

const projectRoot = process.cwd();
const componentPath =
  "src/components/redesign/enhe-redesign-mobile-menu.tsx";
const motionPath = "src/lib/motion/mobile-nav-motion.ts";
const stylesPath = "src/styles/redesign/shell.css";
const navigationPath = "src/components/redesign/navigation.ts";

function readProjectFile(relativePath: string) {
  const path = join(projectRoot, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("production mobile navigation directional drawer", () => {
  it("resolves the approved pointer open and faster close profiles", () => {
    expect(resolveMobileNavMotion("pointer", "open")).toEqual({
      drawer: {
        durationMs: 230,
        ease: [0.16, 1, 0.3, 1],
        transform: ["translateX(100%)", "translateX(0)"],
      },
      overlay: {
        durationMs: 180,
        ease: [0.16, 1, 0.3, 1],
        opacity: [0, 1],
      },
    });
    expect(resolveMobileNavMotion("pointer", "close")).toEqual({
      drawer: {
        durationMs: 190,
        ease: [0.16, 1, 0.3, 1],
        transform: ["translateX(0)", "translateX(100%)"],
      },
      overlay: {
        durationMs: 160,
        ease: [0.16, 1, 0.3, 1],
        opacity: [1, 0],
      },
    });
  });

  it("keeps keyboard fast and reduced motion at 80ms opacity-only", () => {
    for (const phase of ["open", "close"] as const) {
      const keyboard = resolveMobileNavMotion("keyboard", phase);
      const reduced = resolveMobileNavMotion("reduced", phase);

      expect(keyboard.drawer.durationMs).toBeLessThanOrEqual(100);
      expect(keyboard.drawer.ease).toBe("linear");
      expect(keyboard.drawer.opacity).toEqual(
        phase === "open" ? [0, 1] : [1, 0],
      );
      expect(keyboard.drawer).not.toHaveProperty("transform");
      expect(keyboard.overlay.durationMs).toBeLessThanOrEqual(100);

      expect(reduced).toEqual({
        drawer: {
          durationMs: 80,
          ease: "linear",
          opacity: phase === "open" ? [0, 1] : [1, 0],
        },
        overlay: {
          durationMs: 80,
          ease: "linear",
          opacity: phase === "open" ? [0, 1] : [1, 0],
        },
      });
    }
  });

  it("uses an interruptible rendered layer with latest-state cleanup", () => {
    const component = readProjectFile(componentPath);
    const motion = readProjectFile(motionPath);

    expect(component).toContain('import { animate } from "motion/react"');
    expect(component).toContain("activeAnimationsRef");
    expect(component).toContain("stopActiveAnimations");
    expect(component).toContain("layerRendered");
    expect(component).toContain("openRef.current");
    expect(component).toContain("animationIntentRef.current");
    expect(component).toContain('data-motion-variant="directional-drawer"');
    expect(`${component}\n${motion}`).not.toMatch(/setTimeout\s*\(|@keyframes/);
  });

  it("preserves dialog, focus, Escape, body-lock, and route semantics", () => {
    const component = readProjectFile(componentPath);

    expect(component).toContain('role="dialog"');
    expect(component).toContain('aria-modal="true"');
    expect(component).toContain("aria-expanded={open}");
    expect(component).toContain("aria-controls={menuId}");
    expect(component).toContain('event.key === "Escape"');
    expect(component).toContain('event.key !== "Tab"');
    expect(component).not.toContain("previouslyFocusedElement");
    expect(component).toContain("mountedTrigger");
    expect(component).toContain('document.body.style.overflow = "hidden"');
    expect(component).toContain('event.detail === 0 ? "keyboard" : "pointer"');
    expect(component).not.toContain("aria-selected");
    expect(component).not.toMatch(/await\s+.*(?:close|animation).*href|setTimeout\s*\(/);
  });

  it("cleans the drawer when resizing across the fixed 768px breakpoint", () => {
    const component = readProjectFile(componentPath);
    const styles = readProjectFile(stylesPath);

    expect(component).toContain('const MOBILE_NAV_QUERY = "(width < 768px)"');
    expect(component).toContain("window.matchMedia(MOBILE_NAV_QUERY)");
    expect(component).toContain('mediaQuery.addEventListener("change"');
    expect(component).toContain("desktopFocusTargetRef");
    expect(styles).toContain("@media (width < 768px)");
    expect(styles).not.toContain("@media (width < 769px)");
  });

  it("keeps the drawer above support without changing support geometry", () => {
    const component = readProjectFile(componentPath);
    const styles = readProjectFile(stylesPath);

    expect(styles).toMatch(/\.redesign-menu-overlay\s*{[\s\S]*?z-index:\s*calc\(var\(--enhe-z-layer\) - 1\)/);
    expect(styles).toMatch(/\.redesign-mobile-drawer\s*{[\s\S]*?z-index:\s*var\(--enhe-z-layer\)/);
    expect(styles).toMatch(/\.customer-support-widget\s*{[\s\S]*?z-index:\s*10/);
    expect(component).toContain("FOCUSABLE_MENU_CONTROLS");
    expect(styles).toContain("--support-exclusion-compact: 52px");
    expect(styles).toContain("--support-exclusion-expanded: 104px");
    expect(styles).toContain("@media (width < 484px)");
  });

  it("keeps the exact bilingual navigation order and approved scope", () => {
    const component = readProjectFile(componentPath);
    const motion = readProjectFile(motionPath);
    const navigation = readProjectFile(navigationPath);
    const styles = readProjectFile(stylesPath);
    const drawerStyles = styles.slice(
      styles.indexOf(".redesign-menu-overlay"),
      styles.indexOf(".redesign-mobile-account"),
    );
    const implementation = `${component}\n${motion}\n${drawerStyles}`;

    for (const orderedLabels of [
      ["AI工具", "AI Skill", "AI资讯", "AI趋势", "关于我们", "搜索"],
      ["AI Tools", "AI Skills", "AI News", "AI Trends", "About", "Search"],
    ]) {
      let lastIndex = -1;
      for (const label of orderedLabels) {
        const index = navigation.indexOf(`label: "${label}"`);
        expect(index, `${label} order`).toBeGreaterThan(lastIndex);
        lastIndex = index;
      }
    }

    expect(implementation).not.toMatch(/transition:\s*all/i);
    expect(implementation).not.toMatch(/scale\(0\)(?!\.)/);
    expect(implementation).not.toMatch(/will-change/i);
    expect(implementation).not.toMatch(/\b(?:spring|bounce|rotate|blur)\b/i);
    expect(implementation).not.toMatch(
      /(?:animate|transition)[^;\n]*(?:width|height|margin|padding|top|left)/i,
    );
    expect(implementation).not.toContain("redesign-preview/motion");
  });
});
