export type ProductStageInputModality = "keyboard" | "pointer";
export type ProductStageMotionProfile = ProductStageInputModality | "reduced";
export type ProductStageDirection = -1 | 1;

export type ProductStageMotion = {
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

export const PRODUCT_STAGE_MOTION_REST_TRANSFORM = "translateX(0)";

const PRODUCT_STAGE_MOTION_EASE: [number, number, number, number] = [
  0.16, 1, 0.3, 1,
];

export function resolveProductStageMotion(
  profile: ProductStageMotionProfile,
  direction: ProductStageDirection,
): ProductStageMotion {
  if (profile === "keyboard") {
    return {
      durationMs: 0,
      ease: "linear",
      incoming: { opacity: [1, 1] },
      outgoing: { opacity: 0 },
    };
  }

  if (profile === "reduced") {
    return {
      durationMs: 80,
      ease: "linear",
      incoming: { opacity: [0, 1] },
      outgoing: { opacity: 0 },
    };
  }

  const distance = 12 * direction;

  return {
    durationMs: 240,
    ease: PRODUCT_STAGE_MOTION_EASE,
    incoming: {
      opacity: [0, 1],
      transform: [
        `translateX(${distance}px)`,
        PRODUCT_STAGE_MOTION_REST_TRANSFORM,
      ],
    },
    outgoing: {
      opacity: 0,
      transform: `translateX(${-distance}px)`,
    },
  };
}
