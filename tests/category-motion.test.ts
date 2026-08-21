import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CATEGORY_LAYER_MOTION_VARIANTS,
  CATEGORY_MOTION_REST_TRANSFORM,
  resolveCategoryMotionEnterTransform,
  type CategoryLayerMotionCustom,
} from "@/lib/motion/category-layer-motion";

const projectRoot = process.cwd();

function readProjectFile(relativePath: string) {
  const path = join(projectRoot, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function resolveVariant(variant: unknown, custom: CategoryLayerMotionCustom) {
  expect(typeof variant).toBe("function");
  return (
    variant as (motionCustom: CategoryLayerMotionCustom) => {
      opacity: number;
      transform?: string;
      transition: { duration: number; ease: string | [number, number, number, number] };
    }
  )(custom);
}

const selectorPath =
  "src/components/redesign/software/EnheRedesignSoftwareCategorySelector.tsx";
const stylesPath =
  "src/components/redesign/software/EnheRedesignSoftwareCategoryMotion.module.css";
const motionPath = "src/lib/motion/category-layer-motion.ts";

describe("production category origin-aware motion", () => {
  it("uses the approved durations, easing, and responsive pointer transforms", () => {
    const selector = readProjectFile(selectorPath);
    const motionSource = readProjectFile(motionPath);
    const implementation = `${selector}\n${motionSource}`;

    expect(selector).toContain('from "motion/react"');
    expect(selector).toContain("motion.div");
    expect(selector).not.toContain("useReducedMotion");
    expect(selector).toContain("window.matchMedia(REDUCED_MOTION_QUERY)");
    expect(selector).toContain("CATEGORY_LAYER_MOTION_VARIANTS");
    expect(selector).toMatch(/desktop:\s*190/);
    expect(selector).toMatch(/mobile:\s*230/);
    expect(selector).toMatch(/keyboard:\s*100/);
    expect(selector).toMatch(/reduced:\s*80/);
    expect(motionSource).toContain("[0.16, 1, 0.3, 1]");
    expect(implementation).toContain('"translateY(4px) scale(0.98)"');
    expect(implementation).toContain('"translateY(12px) scale(1)"');
    expect(implementation).toContain('"translateY(0) scale(1)"');
    expect(selector).toContain('data-motion-variant="origin-aware-layer"');
    expect(selector).toContain("data-motion-duration-ms");
  });

  it("samples the desktop transform origin and removes transform travel for keyboard and reduced motion", () => {
    const selector = readProjectFile(selectorPath);

    expect(selector).toContain("buttonRef.current?.getBoundingClientRect()");
    expect(selector).toContain("layerRef.current?.getBoundingClientRect()");
    expect(selector).toContain("style.transformOrigin");
    expect(selector).toContain('data-motion-origin="trigger"');
    expect(selector).toContain('event.detail === 0 ? "keyboard" : "pointer"');
    expect(selector).toContain('data-motion-modality={motionProfile}');
    expect(selector).toContain(
      'isMotionReduced || inputModality === "keyboard" ? "none" : enterTransform',
    );
  });

  it("resolves real pointer, keyboard, and reduced variants from the approved contract", () => {
    const desktopPointer: CategoryLayerMotionCustom = {
      durationMs: 190,
      enterTransform: resolveCategoryMotionEnterTransform("pointer", false),
      profile: "pointer",
    };
    const mobilePointer: CategoryLayerMotionCustom = {
      durationMs: 230,
      enterTransform: resolveCategoryMotionEnterTransform("pointer", true),
      profile: "pointer",
    };
    const keyboard: CategoryLayerMotionCustom = {
      durationMs: 100,
      enterTransform: resolveCategoryMotionEnterTransform("keyboard", true),
      profile: "keyboard",
    };
    const reduced: CategoryLayerMotionCustom = {
      durationMs: 80,
      enterTransform: resolveCategoryMotionEnterTransform("reduced", true),
      profile: "reduced",
    };

    expect(resolveVariant(CATEGORY_LAYER_MOTION_VARIANTS.hidden, desktopPointer)).toEqual({
      opacity: 0,
      transform: "translateY(4px) scale(0.98)",
      transition: { duration: 0.19, ease: [0.16, 1, 0.3, 1] },
    });
    expect(resolveVariant(CATEGORY_LAYER_MOTION_VARIANTS.visible, desktopPointer)).toEqual({
      opacity: 1,
      transform: CATEGORY_MOTION_REST_TRANSFORM,
      transition: { duration: 0.19, ease: [0.16, 1, 0.3, 1] },
    });
    expect(resolveVariant(CATEGORY_LAYER_MOTION_VARIANTS.hidden, mobilePointer).transform).toBe(
      "translateY(12px) scale(1)",
    );

    const keyboardFrame = resolveVariant(CATEGORY_LAYER_MOTION_VARIANTS.hidden, keyboard);
    expect(keyboardFrame).not.toHaveProperty("transform");
    expect(keyboardFrame.transition).toEqual({ duration: 0.1, ease: [0.16, 1, 0.3, 1] });

    const reducedFrame = resolveVariant(CATEGORY_LAYER_MOTION_VARIANTS.hidden, reduced);
    expect(reducedFrame).not.toHaveProperty("transform");
    expect(reducedFrame.transition).toEqual({ duration: 0.08, ease: "linear" });
  });

  it("completes the mobile sheet accessibility lifecycle without changing category semantics", () => {
    const selector = readProjectFile(selectorPath);
    const styles = readProjectFile(stylesPath);

    expect(selector).toContain('role="dialog"');
    expect(selector).toContain("aria-modal={open && isMobile ? true : undefined}");
    expect(selector).toContain('event.key === "Tab"');
    expect(selector).toContain("FOCUSABLE_CATEGORY_CONTROLS");
    expect(selector).toContain('document.body.style.overflow = "hidden"');
    expect(selector).toContain("previousBodyOverflow");
    expect(selector).toContain('event.key === "Escape"');
    expect(selector).toContain('event.key === "Enter"');
    expect(selector).toContain('event.key === " "');
    expect(selector).toContain('event.key === "ArrowDown"');
    expect(selector).toContain('event.key === "ArrowUp"');
    expect(selector).toContain("buttonRef.current?.focus()");
    expect(selector).toContain('data-category-close="true"');
    expect(styles).toMatch(/min-width:\s*44px/);
    expect(styles).toMatch(/min-height:\s*44px/);
  });

  it("keeps the motion scoped, GPU-only, and free of prohibited patterns", () => {
    const selector = readProjectFile(selectorPath);
    const styles = readProjectFile(stylesPath);
    const motionSource = readProjectFile(motionPath);
    const implementation = `${selector}\n${styles}\n${motionSource}`;

    expect(implementation).not.toMatch(/transition:\s*all/i);
    expect(implementation).not.toMatch(/scale\(0\)(?!\.)/);
    expect(implementation).not.toMatch(/will-change/i);
    expect(implementation).not.toMatch(
      /(?:animate|transition)[^;\n]*(?:width|height|margin|padding|top|left)/i,
    );
    expect(implementation).not.toContain("directional-slide");
    expect(implementation).not.toContain("directional-drawer");
    expect(implementation).not.toContain("redesign-preview/motion");
  });
});
