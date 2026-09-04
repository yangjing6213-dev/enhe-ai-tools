"use client";

import { useEffect, useRef } from "react";

// Adapted from React Bits BorderGlow, licensed MIT + Commons Clause.
const EDGE_SENSITIVITY = 30;
const CARD_SELECTOR = [
  ".glass",
  ".evidence-card",
  ".dossier-card",
  ".surface-panel:not(.rounded-full)",
  ".surface-panel-soft:not(.rounded-full)",
  ".filter-surface",
  ".admin-shell-card",
  ".home-product-preview",
  ".home-product-preview-empty",
  ".home-fallback-link",
  ".tool-detail-copy-card"
].join(", ");

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

function getPointerPoint(card: HTMLElement, event: PointerEvent) {
  const rect = card.getBoundingClientRect();
  return {
    rect,
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function getEdgeProximity(rect: DOMRect, x: number, y: number) {
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const dx = x - cx;
  const dy = y - cy;
  let kx = Infinity;
  let ky = Infinity;

  if (dx !== 0) {
    kx = cx / Math.abs(dx);
  }

  if (dy !== 0) {
    ky = cy / Math.abs(dy);
  }

  return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
}

function getCursorAngle(rect: DOMRect, x: number, y: number) {
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const dx = x - cx;
  const dy = y - cy;

  if (dx === 0 && dy === 0) {
    return 0;
  }

  const radians = Math.atan2(dy, dx);
  let degrees = radians * (180 / Math.PI) + 90;

  if (degrees < 0) {
    degrees += 360;
  }

  return degrees;
}

function resetCard(card: HTMLElement | null) {
  if (!card) {
    return;
  }

  card.style.setProperty("--edge-proximity", "0");
  card.style.setProperty("--border-glow-strength", "0");
}

function findGlowCard(target: EventTarget | null) {
  return target instanceof Element ? (target.closest(CARD_SELECTOR) as HTMLElement | null) : null;
}

export function BorderGlowController() {
  const activeCardRef = useRef<HTMLElement | null>(null);
  const enabledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncEnabled = () => {
      const nextEnabled = !coarsePointerQuery.matches && !reducedMotionQuery.matches;
      enabledRef.current = nextEnabled;

      if (!nextEnabled) {
        resetCard(activeCardRef.current);
        activeCardRef.current = null;
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!enabledRef.current) {
        return;
      }

      const card = findGlowCard(event.target);

      if (!card) {
        resetCard(activeCardRef.current);
        activeCardRef.current = null;
        return;
      }

      if (activeCardRef.current !== card) {
        resetCard(activeCardRef.current);
        activeCardRef.current = card;
      }

      const { rect, x, y } = getPointerPoint(card, event);
      const edge = getEdgeProximity(rect, x, y);
      const angle = getCursorAngle(rect, x, y);
      const edgeProximity = edge * 100;
      const glowStrength = Math.min(edgeProximity / EDGE_SENSITIVITY, 1);

      card.style.setProperty("--edge-proximity", edgeProximity.toFixed(3));
      card.style.setProperty("--border-glow-strength", glowStrength.toFixed(3));
      card.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
    };

    const handlePointerOut = (event: PointerEvent) => {
      const card = activeCardRef.current;

      if (!card) {
        return;
      }

      const nextTarget = event.relatedTarget;

      if (!(nextTarget instanceof Element) || !card.contains(nextTarget)) {
        resetCard(card);
        activeCardRef.current = null;
      }
    };

    const handleWindowBlur = () => {
      resetCard(activeCardRef.current);
      activeCardRef.current = null;
    };

    syncEnabled();

    const unbindCoarsePointer = bindMediaChange(coarsePointerQuery, syncEnabled);
    const unbindReducedMotion = bindMediaChange(reducedMotionQuery, syncEnabled);

    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerout", handlePointerOut);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      unbindCoarsePointer();
      unbindReducedMotion();
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("blur", handleWindowBlur);
      resetCard(activeCardRef.current);
    };
  }, []);

  return null;
}
