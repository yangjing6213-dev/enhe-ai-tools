import type { Variants } from "motion/react";

export const CATEGORY_MOTION_REST_TRANSFORM = "translateY(0) scale(1)";

const CATEGORY_MOTION_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const CATEGORY_REDUCED_MOTION_EASE = "linear" as const;

export type CategoryInputModality = "keyboard" | "pointer";
export type CategoryMotionProfile = CategoryInputModality | "reduced";

export type CategoryLayerMotionCustom = {
  durationMs: number;
  enterTransform: string;
  profile: CategoryMotionProfile;
};

export function resolveCategoryMotionEnterTransform(
  profile: CategoryMotionProfile,
  isMobile: boolean,
) {
  if (profile !== "pointer") {
    return CATEGORY_MOTION_REST_TRANSFORM;
  }

  return isMobile ? "translateY(12px) scale(1)" : "translateY(4px) scale(0.98)";
}

function motionTransition(durationMs: number, profile: CategoryMotionProfile) {
  return {
    duration: durationMs / 1000,
    ease: profile === "reduced" ? CATEGORY_REDUCED_MOTION_EASE : CATEGORY_MOTION_EASE,
  };
}

export const CATEGORY_OVERLAY_MOTION_VARIANTS = {
  hidden: ({ durationMs, profile }: CategoryLayerMotionCustom) => ({
    opacity: 0,
    transition: motionTransition(durationMs, profile),
  }),
  visible: ({ durationMs, profile }: CategoryLayerMotionCustom) => ({
    opacity: 1,
    transition: motionTransition(durationMs, profile),
  }),
} satisfies Variants;

export const CATEGORY_LAYER_MOTION_VARIANTS = {
  hidden: ({ durationMs, enterTransform, profile }: CategoryLayerMotionCustom) => ({
    opacity: 0,
    ...(profile === "pointer" ? { transform: enterTransform } : {}),
    transition: motionTransition(durationMs, profile),
  }),
  visible: ({ durationMs, profile }: CategoryLayerMotionCustom) => ({
    opacity: 1,
    ...(profile === "pointer" ? { transform: CATEGORY_MOTION_REST_TRANSFORM } : {}),
    transition: motionTransition(durationMs, profile),
  }),
} satisfies Variants;
