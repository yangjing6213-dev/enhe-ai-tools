const MOBILE_NAV_EASE: [number, number, number, number] = [
  0.16, 1, 0.3, 1,
];

export type MobileNavInputModality = "keyboard" | "pointer";
export type MobileNavMotionProfile = MobileNavInputModality | "reduced";
export type MobileNavMotionPhase = "open" | "close";

type MobileNavMotionSegment = {
  durationMs: number;
  ease: "linear" | [number, number, number, number];
  opacity?: [number, number];
  transform?: [string, string];
};

export type MobileNavMotion = {
  drawer: MobileNavMotionSegment;
  overlay: MobileNavMotionSegment;
};

export function resolveMobileNavMotion(
  profile: MobileNavMotionProfile,
  phase: MobileNavMotionPhase,
): MobileNavMotion {
  const opacity: [number, number] =
    phase === "open" ? [0, 1] : [1, 0];

  if (profile === "reduced") {
    return {
      drawer: { durationMs: 80, ease: "linear", opacity },
      overlay: { durationMs: 80, ease: "linear", opacity },
    };
  }

  if (profile === "keyboard") {
    return {
      drawer: { durationMs: 100, ease: "linear", opacity },
      overlay: { durationMs: 100, ease: "linear", opacity },
    };
  }

  return phase === "open"
    ? {
        drawer: {
          durationMs: 230,
          ease: MOBILE_NAV_EASE,
          transform: ["translateX(100%)", "translateX(0)"],
        },
        overlay: {
          durationMs: 180,
          ease: MOBILE_NAV_EASE,
          opacity,
        },
      }
    : {
        drawer: {
          durationMs: 190,
          ease: MOBILE_NAV_EASE,
          transform: ["translateX(0)", "translateX(100%)"],
        },
        overlay: {
          durationMs: 160,
          ease: MOBILE_NAV_EASE,
          opacity,
        },
      };
}
