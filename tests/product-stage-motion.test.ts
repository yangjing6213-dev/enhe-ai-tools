import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import * as showcaseModule from "@/components/redesign/home/EnheRedesignProductShowcase";

type MotionResolver = (
  profile: "pointer" | "keyboard" | "reduced",
  direction: -1 | 1,
) => {
  durationMs: number;
  ease: "linear" | [number, number, number, number];
  incoming: {
    opacity: [number, number];
    transform?: [string, string];
  };
  outgoing: {
    opacity: number;
    transform?: string;
  };
};

const projectRoot = process.cwd();

function readProjectFile(relativePath: string) {
  const path = join(projectRoot, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const componentPath =
  "src/components/redesign/home/EnheRedesignProductShowcase.tsx";
const stylesPath =
  "src/components/redesign/home/EnheRedesignProductStageMotion.module.css";
const motionPath = "src/lib/motion/product-stage-motion.ts";

describe("production home product directional slide", () => {
  it("resolves the approved pointer direction, duration, and easing", () => {
    const resolver = Reflect.get(
      showcaseModule,
      "resolveProductStageMotion",
    ) as MotionResolver | undefined;

    expect(resolver).toBeTypeOf("function");
    if (!resolver) return;

    expect(resolver("pointer", 1)).toEqual({
      durationMs: 240,
      ease: [0.16, 1, 0.3, 1],
      incoming: {
        opacity: [0, 1],
        transform: ["translateX(12px)", "translateX(0)"],
      },
      outgoing: {
        opacity: 0,
        transform: "translateX(-12px)",
      },
    });
    expect(resolver("pointer", -1)).toEqual({
      durationMs: 240,
      ease: [0.16, 1, 0.3, 1],
      incoming: {
        opacity: [0, 1],
        transform: ["translateX(-12px)", "translateX(0)"],
      },
      outgoing: {
        opacity: 0,
        transform: "translateX(12px)",
      },
    });
  });

  it("keeps keyboard instant and reduced motion opacity-only", () => {
    const resolver = Reflect.get(
      showcaseModule,
      "resolveProductStageMotion",
    ) as MotionResolver | undefined;

    expect(resolver).toBeTypeOf("function");
    if (!resolver) return;

    expect(resolver("keyboard", 1)).toEqual({
      durationMs: 0,
      ease: "linear",
      incoming: { opacity: [1, 1] },
      outgoing: { opacity: 0 },
    });
    expect(resolver("reduced", -1)).toEqual({
      durationMs: 80,
      ease: "linear",
      incoming: { opacity: [0, 1] },
      outgoing: { opacity: 0 },
    });
  });

  it("stops obsolete controls and keeps the latest product intent authoritative", () => {
    const component = readProjectFile(componentPath);

    expect(component).toContain("indexRef.current");
    expect(component).toContain("stopActiveAnimations");
    expect(component).toContain("control.stop()");
    expect(component).toContain("interruptedIncomingStyleRef.current");
    expect(component).toContain("window.getComputedStyle(returningLayer)");
    expect(component).toContain("setPreviousIndex(outgoingIndex)");
    expect(component).toContain("setTransitionKey");
    expect(component).toContain("key={product.id}");
    expect(component).toContain('data-motion-variant="directional-slide"');
    expect(component).toContain("data-product-current");
    expect(component).not.toMatch(/setInterval|autoplay/i);
    expect(component).not.toMatch(/setTimeout\s*\(/);
  });

  it("keeps formal SSR, keyboard focus, and live-region semantics scoped to the stage", () => {
    const component = readProjectFile(componentPath);

    expect(component).toContain("useState<number | null>(null)");
    expect(component).toContain("aria-controls={panelId}");
    expect(component).toContain('aria-live="polite"');
    expect(component).toContain('aria-atomic="true"');
    expect(component).toContain('event.key === "ArrowLeft"');
    expect(component).toContain('event.key === "ArrowRight"');
    expect(component).toContain('event.detail === 0 ? "keyboard" : "pointer"');
    expect(component).toContain("window.matchMedia(REDUCED_MOTION_QUERY)");
    expect(component).not.toContain("redesign-preview/motion");
  });

  it("uses only scoped transform and opacity motion without prohibited patterns", () => {
    const component = readProjectFile(componentPath);
    const styles = readProjectFile(stylesPath);
    const motion = readProjectFile(motionPath);
    const implementation = `${component}\n${styles}\n${motion}`;

    expect(styles).not.toBe("");
    expect(motion).not.toBe("");
    expect(component).toContain('from "motion/react"');
    expect(component).toContain("transform:");
    expect(component).not.toMatch(/\b(?:x|y|scale):\s*\[/);
    expect(implementation).not.toMatch(/transition:\s*all/i);
    expect(implementation).not.toMatch(/will-change/i);
    expect(implementation).not.toMatch(/scale\(0\)(?!\.)/);
    expect(implementation).not.toMatch(/\b(?:spring|bounce|rotate|blur)\b/i);
    expect(implementation).not.toMatch(
      /(?:animate|transition)[^;\n]*(?:width|height|margin|padding|top|left)/i,
    );
    expect(implementation).not.toContain("directional-drawer");
  });
});
