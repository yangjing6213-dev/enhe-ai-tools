"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { loadGsap } from "@/lib/gsap-runtime";

type GsapTimeline = ReturnType<Awaited<ReturnType<typeof loadGsap>>["timeline"]>;

type ProductDemoMotionCardProps = {
  children: ReactNode;
};

const motionMediaQuery = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export function ProductDemoMotionCard({ children }: ProductDemoMotionCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<GsapTimeline | null>(null);
  const pointerInsideRef = useRef(false);
  const focusInsideRef = useRef(false);

  const syncTimeline = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    if (pointerInsideRef.current || focusInsideRef.current) timeline.play();
    else timeline.reverse();
  }, []);

  useEffect(() => {
    let isActive = true;
    let cleanup = () => {};

    void loadGsap()
      .then((gsap) => {
        if (!isActive) return;
        const media = gsap.matchMedia();
        cleanup = () => {
          media.revert();
        };

        media.add(motionMediaQuery, () => {
          const card = cardRef.current;
          if (!card) return;

          const cover = card.querySelector<HTMLElement>(
            ".product-demo-card-media img, .product-demo-card-placeholder",
          );
          const playBadge = card.querySelector<HTMLElement>(".product-demo-card-play");
          const bodyCopy = card.querySelectorAll<HTMLElement>(
            ".product-demo-card-body > h3, .product-demo-card-body > p, .product-demo-card-tags",
          );
          const actions = card.querySelector<HTMLElement>(".product-demo-card-actions");
          const timeline = gsap.timeline({
            paused: true,
            defaults: { ease: "power2.out", overwrite: "auto" },
          });

          if (cover) timeline.to(cover, { scale: 1.025, duration: 0.38 }, 0);
          if (playBadge) timeline.to(playBadge, { y: -3, duration: 0.24 }, 0);
          if (bodyCopy.length) timeline.to(bodyCopy, { y: -2, duration: 0.28, stagger: 0.025 }, 0.04);
          if (actions) timeline.to(actions, { y: -3, duration: 0.28 }, 0.08);

          timelineRef.current = timeline;
          syncTimeline();
          return () => {
            timeline.kill();
            timelineRef.current = null;
            gsap.set([cover, playBadge, ...bodyCopy, actions].filter(Boolean), { clearProps: "transform" });
          };
        });
      })
      .catch(() => {
        timelineRef.current = null;
      });

    return () => {
      isActive = false;
      cleanup();
      timelineRef.current = null;
    };
  }, [syncTimeline]);

  const handlePointerEnter = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    pointerInsideRef.current = true;
    syncTimeline();
  }, [syncTimeline]);

  const handlePointerLeave = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    pointerInsideRef.current = false;
    syncTimeline();
  }, [syncTimeline]);

  const handleFocus = useCallback(() => {
    focusInsideRef.current = true;
    syncTimeline();
  }, [syncTimeline]);

  const handleBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    focusInsideRef.current = false;
    syncTimeline();
  }, [syncTimeline]);

  return (
    <article
      ref={cardRef}
      className="product-demo-card surface-panel"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
    >
      {children}
    </article>
  );
}
