"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BorderGlow from "@/components/BorderGlow";
import { isCardGlowTarget } from "@/lib/card-glow-target";
import "./site-card-glow.css";

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
  let element = target instanceof Element ? target : null;
  if (element?.closest(".redesign-home-product-stage")) return null;
  while (element && element !== document.body) {
    if (element instanceof HTMLElement && !element.closest(".enhe-edge-effect") &&
        (element.matches(CARD_SELECTOR) || isCardGlowTarget(element.tagName, Array.from(element.classList), element.dataset.slot))) {
      return element;
    }
    element = element.parentElement;
  }
  return null;
}

function getCardClip(card: HTMLElement, rect: DOMRect) {
  let left = 0, top = 0, right = window.innerWidth, bottom = window.innerHeight;
  for (let parent = card.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    if (style.overflowX === "visible" && style.overflowY === "visible") continue;
    const bounds = parent.getBoundingClientRect();
    if (style.overflowX !== "visible") { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
    if (style.overflowY !== "visible") { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
  }
  return `inset(${Math.max(0, top - rect.top)}px ${Math.max(0, rect.right - right)}px ${Math.max(0, rect.bottom - bottom)}px ${Math.max(0, left - rect.left)}px)`;
}

export function BorderGlowController() {
  const [glowCard, setGlowCard] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const activeCardRef = useRef<HTMLElement | null>(null);
  const enabledRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const latestPointerEventRef = useRef<PointerEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stopFrame = () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const syncEnabled = () => {
      const nextEnabled = !coarsePointerQuery.matches && !reducedMotionQuery.matches;
      enabledRef.current = nextEnabled;

      if (!nextEnabled) {
        stopFrame();
        latestPointerEventRef.current = null;
        resetCard(activeCardRef.current);
        activeCardRef.current = null;
        overlayRef.current?.style.setProperty("--edge-proximity", "0");
      }
    };

    const renderGlowFrame = () => {
      rafRef.current = null;

      if (!enabledRef.current) {
        return;
      }

      const event = latestPointerEventRef.current;
      if (!event) {
        return;
      }

      const card = findGlowCard(event.target);

      if (!card) {
        resetCard(activeCardRef.current);
        activeCardRef.current = null;
        overlayRef.current?.style.setProperty("--edge-proximity", "0");
        return;
      }

      if (activeCardRef.current !== card) {
        resetCard(activeCardRef.current);
        activeCardRef.current = card;
        setGlowCard(card);
      }

      const { rect, x, y } = getPointerPoint(card, event);
      const edge = getEdgeProximity(rect, x, y);
      const angle = getCursorAngle(rect, x, y);
      const edgeProximity = edge * 100;
      const glowStrength = Math.max((edgeProximity - EDGE_SENSITIVITY) / (100 - EDGE_SENSITIVITY), 0);

      card.style.setProperty("--edge-proximity", edgeProximity.toFixed(3));
      card.style.setProperty("--border-glow-strength", glowStrength.toFixed(3));
      card.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
      const overlay = overlayRef.current;
      if (overlay) {
        overlay.style.left = `${rect.left}px`;
        overlay.style.top = `${rect.top}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        overlay.style.borderRadius = getComputedStyle(card).borderRadius;
        overlay.style.clipPath = getCardClip(card, rect);
        overlay.style.setProperty("--edge-proximity", edgeProximity.toFixed(3));
        overlay.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!enabledRef.current || event.pointerType === "touch" || document.hidden) {
        return;
      }

      latestPointerEventRef.current = event;

      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(renderGlowFrame);
      }
    };

    const handlePointerOut = (event: PointerEvent) => {
      const card = activeCardRef.current;

      if (!card) {
        return;
      }

      const nextTarget = event.relatedTarget;

      if (!(nextTarget instanceof Element) || !card.contains(nextTarget)) {
        stopFrame();
        latestPointerEventRef.current = null;
        resetCard(card);
        activeCardRef.current = null;
        overlayRef.current?.style.setProperty("--edge-proximity", "0");
      }
    };

    const handleWindowBlur = () => {
      stopFrame();
      latestPointerEventRef.current = null;
      resetCard(activeCardRef.current);
      activeCardRef.current = null;
      overlayRef.current?.style.setProperty("--edge-proximity", "0");
    };

    const observer = new MutationObserver(() => {
      if (activeCardRef.current && !activeCardRef.current.isConnected) handleWindowBlur();
      setGlowCard(current => current?.isConnected ? current : null);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    syncEnabled();

    const unbindCoarsePointer = bindMediaChange(coarsePointerQuery, syncEnabled);
    const unbindReducedMotion = bindMediaChange(reducedMotionQuery, syncEnabled);

    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerout", handlePointerOut);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleWindowBlur);
    document.addEventListener("scroll", handleWindowBlur, { capture: true, passive: true });
    window.addEventListener("resize", handleWindowBlur);

    return () => {
      unbindCoarsePointer();
      unbindReducedMotion();
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleWindowBlur);
      document.removeEventListener("scroll", handleWindowBlur, true);
      window.removeEventListener("resize", handleWindowBlur);
      observer.disconnect();
      stopFrame();
      latestPointerEventRef.current = null;
      resetCard(activeCardRef.current);
    };
  }, []);

  return glowCard && glowCard.isConnected ? createPortal(
    <BorderGlow
      className="enhe-edge-effect sweep-active"
      decorative
      elementRef={overlayRef}
      style={{
        left: glowCard.getBoundingClientRect().left,
        top: glowCard.getBoundingClientRect().top,
        width: glowCard.getBoundingClientRect().width,
        height: glowCard.getBoundingClientRect().height,
        borderRadius: getComputedStyle(glowCard).borderRadius,
        clipPath: getCardClip(glowCard, glowCard.getBoundingClientRect()),
        "--edge-proximity": glowCard.style.getPropertyValue("--edge-proximity"),
        "--cursor-angle": glowCard.style.getPropertyValue("--cursor-angle"),
      } as React.CSSProperties}
      edgeSensitivity={30}
      glowColor="40 80 80"
      backgroundColor="transparent"
      borderRadius={28}
      glowRadius={40}
      glowIntensity={1}
      coneSpread={25}
      animated={false}
      colors={["#c084fc", "#f472b6", "#38bdf8"]}
    />,
    document.body,
  ) : null;
}
