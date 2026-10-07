"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { RedesignLocale } from "@/components/redesign/types";
import {
  HOME_REVIEWS,
  REVIEW_AUTO_INTERVAL_MS,
  REVIEW_INITIAL_INDEX,
  REVIEW_MANUAL_RESUME_MS,
} from "@/lib/redesign/home/home-reviews";
import { HOME_COPY } from "@/lib/redesign/home/home-copy";

const REVIEW_COPY = {
  zh: {
    previous: "上一条评价",
    next: "下一条评价",
    stars: (count: number) => `${count} 星`,
  },
  en: {
    previous: "Previous review",
    next: "Next review",
    stars: (count: number) => `${count} stars`,
  },
} satisfies Record<RedesignLocale, { previous: string; next: string; stars: (count: number) => string }>;

type ReviewTimerActions = {
  scheduleManualResume: () => void;
};

const REVIEW_DRAG_THRESHOLD_PX = 35;

function getReviewOffset(index: number, activeIndex: number) {
  const count = HOME_REVIEWS.length;
  const half = Math.floor(count / 2);
  const rawOffset = index - activeIndex;

  if (rawOffset > half) return rawOffset - count;
  if (rawOffset < -half) return rawOffset + count;
  return rawOffset;
}

export function EnheRedesignExperienceReviews({ locale }: { locale: RedesignLocale }) {
  const copy = { ...HOME_COPY[locale].review, ...REVIEW_COPY[locale] };
  const reviewSectionRef = useRef<HTMLElement | null>(null);
  const timerActionsRef = useRef<ReviewTimerActions | null>(null);
  const focusPausedRef = useRef(false);
  const [index, setIndex] = useState(REVIEW_INITIAL_INDEX);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  const move = (delta: -1 | 1) => {
    setIndex((current) => (current + delta + HOME_REVIEWS.length) % HOME_REVIEWS.length);
    timerActionsRef.current?.scheduleManualResume();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    }
  };

  useEffect(() => {
    const section = reviewSectionRef.current;
    if (!section) return;

    let intervalId: number | null = null;
    let resumeTimeoutId: number | null = null;
    let isMounted = true;
    let isHovered = false;
    let hasPointer = false;
    let pointerStartX: number | null = null;
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setAutoRotationState = (nextValue: boolean) => {
      if (isMounted) setIsAutoRotating(nextValue);
    };

    const clearAutoInterval = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      setAutoRotationState(false);
    };

    const clearResumeTimeout = () => {
      if (resumeTimeoutId !== null) {
        window.clearTimeout(resumeTimeoutId);
        resumeTimeoutId = null;
      }
    };

    const canRunAutomatically = () =>
      !reducedMotion &&
      !document.hidden &&
      !isHovered &&
      !focusPausedRef.current &&
      !hasPointer &&
      resumeTimeoutId === null;

    const startAutoInterval = () => {
      if (!canRunAutomatically()) {
        setAutoRotationState(false);
        return;
      }
      if (intervalId !== null) {
        setAutoRotationState(true);
        return;
      }
      intervalId = window.setInterval(() => {
        setIndex((current) => (current + 1) % HOME_REVIEWS.length);
      }, REVIEW_AUTO_INTERVAL_MS);
      setAutoRotationState(true);
    };

    const pause = () => {
      clearAutoInterval();
    };

    const resume = () => {
      startAutoInterval();
    };

    const scheduleManualResume = () => {
      clearAutoInterval();
      clearResumeTimeout();
      if (
        reducedMotion ||
        document.hidden ||
        focusPausedRef.current
      ) {
        return;
      }
      resumeTimeoutId = window.setTimeout(() => {
        resumeTimeoutId = null;
        startAutoInterval();
      }, REVIEW_MANUAL_RESUME_MS);
    };

    const handleMouseEnter = () => {
      isHovered = true;
      pause();
    };
    const handleMouseLeave = () => {
      isHovered = false;
      resume();
    };
    const handleFocusIn = () => {
      focusPausedRef.current = true;
      clearResumeTimeout();
      pause();
    };
    const handleFocusOut = (event: FocusEvent) => {
      const nextTarget = event.relatedTarget;
      if (!(nextTarget instanceof Node) || !section.contains(nextTarget)) {
        focusPausedRef.current = false;
        resume();
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      hasPointer = true;
      pointerStartX = event.clientX;
      pause();
    };
    const handlePointerUp = (event: PointerEvent) => {
      const startX = pointerStartX;
      pointerStartX = null;
      hasPointer = false;

      if (startX !== null) {
        const deltaX = event.clientX - startX;
        if (Math.abs(deltaX) > REVIEW_DRAG_THRESHOLD_PX) {
          const direction: -1 | 1 = deltaX > 0 ? -1 : 1;
          setIndex((current) => (current + direction + HOME_REVIEWS.length) % HOME_REVIEWS.length);
          scheduleManualResume();
        }
      }

      resume();
    };
    const handlePointerCancel = () => {
      pointerStartX = null;
      hasPointer = false;
      resume();
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pause();
        clearResumeTimeout();
      } else {
        resume();
      }
    };
    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      if (reducedMotion) {
        pause();
        clearResumeTimeout();
      } else {
        resume();
      }
    };

    timerActionsRef.current = {
      scheduleManualResume,
    };
    section.addEventListener("mouseenter", handleMouseEnter);
    section.addEventListener("mouseleave", handleMouseLeave);
    section.addEventListener("focusin", handleFocusIn);
    section.addEventListener("focusout", handleFocusOut);
    section.addEventListener("pointerdown", handlePointerDown);
    section.addEventListener("pointerup", handlePointerUp);
    section.addEventListener("pointercancel", handlePointerCancel);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    mediaQuery.addEventListener("change", handleReducedMotionChange);
    startAutoInterval();

    return () => {
      isMounted = false;
      clearAutoInterval();
      clearResumeTimeout();
      timerActionsRef.current = null;
      section.removeEventListener("mouseenter", handleMouseEnter);
      section.removeEventListener("mouseleave", handleMouseLeave);
      section.removeEventListener("focusin", handleFocusIn);
      section.removeEventListener("focusout", handleFocusOut);
      section.removeEventListener("pointerdown", handlePointerDown);
      section.removeEventListener("pointerup", handlePointerUp);
      section.removeEventListener("pointercancel", handlePointerCancel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      mediaQuery.removeEventListener("change", handleReducedMotionChange);
    };
  }, []);

  return (
    <section
      ref={reviewSectionRef}
      className="redesign-home-reviews"
      role="region"
      aria-labelledby="redesign-home-reviews-heading"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="redesign-home-reviews-inner">
        <h2 id="redesign-home-reviews-heading">{copy.heading}</h2>
        <p className="redesign-home-reviews-disclosure">{copy.disclosure}</p>
        <div className="redesign-home-reviews-window">
          <div
            className="redesign-home-reviews-track"
            aria-live={isAutoRotating ? "off" : "polite"}
          >
            {HOME_REVIEWS.map((review, reviewIndex) => {
              const offset = getReviewOffset(reviewIndex, index);
              const isActive = offset === 0;

              return (
                <article
                  key={review.productId}
                  className="redesign-home-review-card"
                  data-active={isActive}
                  data-position={offset}
                  aria-hidden={!isActive}
                  aria-label={`${review.productLabel[locale]} — ${copy.heading}`}
                >
                  <div className="redesign-home-review-top">
                    <Image
                      className="redesign-home-review-avatar"
                      src={review.avatarSrc}
                      alt={review.avatarAlt[locale]}
                      width={56}
                      height={56}
                    />
                    <div className="redesign-home-review-person">
                      <strong>{review.displayName[locale]}</strong>
                      <span>{review.productLabel[locale]}</span>
                    </div>
                    <span className="redesign-home-review-stars" aria-label={copy.stars(review.stars)}>
                      {"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}
                    </span>
                  </div>
                  <blockquote>{review.quote[locale]}</blockquote>
                </article>
              );
            })}
          </div>
          <div className="redesign-home-reviews-controls">
            <button
              type="button"
              className="redesign-home-reviews-control"
              onClick={() => move(-1)}
              aria-label={copy.previous}
            >
              <svg
                className="redesign-home-review-triangle"
                data-direction="previous"
                aria-hidden="true"
                viewBox="0 0 24 24"
                focusable="false"
              >
                <path d="M7.2 4.8 18 10.9a1.25 1.25 0 0 1 0 2.2L7.2 19.2A1.35 1.35 0 0 1 5.2 18V6a1.35 1.35 0 0 1 2-1.2Z" fill="currentColor" />
              </svg>
            </button>
            <button
              type="button"
              className="redesign-home-reviews-control"
              onClick={() => move(1)}
              aria-label={copy.next}
            >
              <svg
                className="redesign-home-review-triangle"
                data-direction="next"
                aria-hidden="true"
                viewBox="0 0 24 24"
                focusable="false"
              >
                <path d="M7.2 4.8 18 10.9a1.25 1.25 0 0 1 0 2.2L7.2 19.2A1.35 1.35 0 0 1 5.2 18V6a1.35 1.35 0 0 1 2-1.2Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
