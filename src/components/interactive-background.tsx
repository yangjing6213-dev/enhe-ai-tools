"use client";

import { useEffect } from "react";

export function InteractiveBackground() {
  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const root = document.documentElement;
    const finePointerQuery = window.matchMedia("(pointer: fine)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId: number | null = null;
    let latestPoint = { x: 0, y: 0 };

    const updatePointer = (event: PointerEvent) => {
      if (!finePointerQuery.matches || reducedMotionQuery.matches || document.visibilityState === "hidden") {
        return;
      }

      latestPoint = { x: event.clientX, y: event.clientY };

      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        root.style.setProperty("--mouse-x", `${latestPoint.x}px`);
        root.style.setProperty("--mouse-y", `${latestPoint.y}px`);
      });
    };

    window.addEventListener("pointermove", updatePointer, { passive: true });
    return () => {
      window.removeEventListener("pointermove", updatePointer);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <div className="interactive-backdrop" aria-hidden="true">
      <div className="interactive-grid" />
    </div>
  );
}
