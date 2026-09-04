"use client";

import { useEffect, useRef, useState } from "react";

const EASE = 0.14;
const INITIAL_COORDINATE = 0;

function bindMediaChange(query: MediaQueryList, listener: () => void) {
  const mediaQuery = query as MediaQueryList & {
    addListener?: (callback: () => void) => void;
    removeListener?: (callback: () => void) => void;
  };

  if (typeof mediaQuery.addEventListener === "function") {
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }

  mediaQuery.addListener?.(listener);
  return () => mediaQuery.removeListener?.(listener);
}

export function CursorGlow() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const enabledRef = useRef(false);
  const visibleRef = useRef(false);
  const targetRef = useRef({ x: INITIAL_COORDINATE, y: INITIAL_COORDINATE });
  const currentRef = useRef({ x: INITIAL_COORDINATE, y: INITIAL_COORDINATE });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const stopFrameLoop = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    const tick = () => {
      if (enabledRef.current && visibleRef.current && shellRef.current) {
        const dx = targetRef.current.x - currentRef.current.x;
        const dy = targetRef.current.y - currentRef.current.y;

        currentRef.current.x += dx * EASE;
        currentRef.current.y += dy * EASE;
        shellRef.current.style.transform = `translate3d(${currentRef.current.x}px, ${currentRef.current.y}px, 0)`;
        frameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      frameRef.current = null;
    };

    const startFrameLoop = () => {
      if (
        !enabledRef.current ||
        !visibleRef.current ||
        document.visibilityState === "hidden" ||
        frameRef.current !== null
      ) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(tick);
    };

    const hideGlow = () => {
      visibleRef.current = false;
      setVisible(false);

      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }

      stopFrameLoop();
    };

    const syncEnabled = () => {
      const nextEnabled = !coarsePointerQuery.matches && !reducedMotionQuery.matches;
      enabledRef.current = nextEnabled;
      setEnabled(nextEnabled);

      if (!nextEnabled) {
        hideGlow();
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!enabledRef.current) {
        return;
      }

      targetRef.current = { x: event.clientX, y: event.clientY };

      if (!visibleRef.current) {
        currentRef.current = { x: event.clientX, y: event.clientY };
        visibleRef.current = true;
        setVisible(true);

        if (shellRef.current) {
          shellRef.current.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
        }
      }

      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }

      idleTimerRef.current = window.setTimeout(() => {
        idleTimerRef.current = null;
        stopFrameLoop();
      }, 1400);

      startFrameLoop();
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) {
        hideGlow();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopFrameLoop();
      } else {
        startFrameLoop();
      }
    };

    syncEnabled();

    const unbindCoarsePointer = bindMediaChange(coarsePointerQuery, syncEnabled);
    const unbindReducedMotion = bindMediaChange(reducedMotionQuery, syncEnabled);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerout", handlePointerOut);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", hideGlow);

    return () => {
      unbindCoarsePointer();
      unbindReducedMotion();
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerout", handlePointerOut);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", hideGlow);

      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }

      stopFrameLoop();
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <div
      ref={shellRef}
      aria-hidden="true"
      className={`cursor-glow-shell${visible ? " is-visible" : ""}`}
    >
      <div className="cursor-glow-orb cursor-glow-orb-outer" />
      <div className="cursor-glow-orb cursor-glow-orb-inner" />
    </div>
  );
}
