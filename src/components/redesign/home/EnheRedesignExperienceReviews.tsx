"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import type { RedesignLocale } from "@/components/redesign/types";
import {
  HOME_REVIEWS,
  REVIEW_AUTO_INTERVAL_MS,
  REVIEW_INITIAL_INDEX,
  REVIEW_MANUAL_RESUME_MS,
} from "@/lib/redesign/home/home-reviews";

const REVIEW_COPY = {
  zh: {
    heading: "产品体验示例",
    previous: "上一条评价",
    next: "下一条评价",
    pause: "暂停自动播放",
    resume: "继续自动播放",
    stars: (count: number) => `${count} 星`,
  },
  en: {
    heading: "Product experience examples",
    previous: "Previous example",
    next: "Next example",
    pause: "Pause automatic rotation",
    resume: "Continue automatic rotation",
    stars: (count: number) => `${count} stars`,
  },
} satisfies Record<RedesignLocale, { heading: string; previous: string; next: string; pause: string; resume: string; stars: (count: number) => string }>;

type ReviewTimerActions = {
  pause: () => void;
  resume: () => void;
  scheduleManualResume: () => void;
};

function getReviewOffset(index: number, activeIndex: number) {
  const count = HOME_REVIEWS.length;
  const half = Math.floor(count / 2);
  const rawOffset = index - activeIndex;

  if (rawOffset > half) return rawOffset - count;
  if (rawOffset < -half) return rawOffset + count;
  return rawOffset;
}

export function EnheRedesignExperienceReviews({ locale }: { locale: RedesignLocale }) {
  const copy = REVIEW_COPY[locale];
  const reviewSectionRef = useRef<HTMLElement | null>(null);
  const timerActionsRef = useRef<ReviewTimerActions | null>(null);
  const userPausedRef = useRef(false);
  const [index, setIndex] = useState(REVIEW_INITIAL_INDEX);
  const [isPaused, setIsPaused] = useState(false);

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

  const togglePause = () => {
    const nextPaused = !userPausedRef.current;
    userPausedRef.current = nextPaused;
    setIsPaused(nextPaused);
    if (nextPaused) {
      timerActionsRef.current?.pause();
    } else {
      timerActionsRef.current?.resume();
    }
  };

  useEffect(() => {
    const section = reviewSectionRef.current;
    if (!section) return;

    let intervalId: number | null = null;
    let resumeTimeoutId: number | null = null;
    let isHovered = false;
    let hasFocus = false;
    let hasPointer = false;
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const clearAutoInterval = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
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
      !hasFocus &&
      !hasPointer &&
      !userPausedRef.current &&
      resumeTimeoutId === null;

    const startAutoInterval = () => {
      if (!canRunAutomatically() || intervalId !== null) return;
      intervalId = window.setInterval(() => {
        setIndex((current) => (current + 1) % HOME_REVIEWS.length);
      }, REVIEW_AUTO_INTERVAL_MS);
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
      if (reducedMotion) return;
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
      hasFocus = true;
      pause();
    };
    const handleFocusOut = (event: FocusEvent) => {
      const nextTarget = event.relatedTarget;
      if (!nextTarget || !section.contains(nextTarget as Node)) {
        hasFocus = false;
        resume();
      }
    };
    const handlePointerDown = () => {
      hasPointer = true;
      pause();
    };
    const handlePointerUp = () => {
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

    timerActionsRef.current = { pause, resume, scheduleManualResume };
    section.addEventListener("mouseenter", handleMouseEnter);
    section.addEventListener("mouseleave", handleMouseLeave);
    section.addEventListener("focusin", handleFocusIn);
    section.addEventListener("focusout", handleFocusOut);
    section.addEventListener("pointerdown", handlePointerDown);
    section.addEventListener("pointerup", handlePointerUp);
    section.addEventListener("pointercancel", handlePointerUp);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    mediaQuery.addEventListener("change", handleReducedMotionChange);
    startAutoInterval();

    return () => {
      clearAutoInterval();
      clearResumeTimeout();
      timerActionsRef.current = null;
      section.removeEventListener("mouseenter", handleMouseEnter);
      section.removeEventListener("mouseleave", handleMouseLeave);
      section.removeEventListener("focusin", handleFocusIn);
      section.removeEventListener("focusout", handleFocusOut);
      section.removeEventListener("pointerdown", handlePointerDown);
      section.removeEventListener("pointerup", handlePointerUp);
      section.removeEventListener("pointercancel", handlePointerUp);
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
        <div className="redesign-home-reviews-window">
          <div className="redesign-home-reviews-track" aria-live="polite">
            {HOME_REVIEWS.map((review, reviewIndex) => {
              const offset = getReviewOffset(reviewIndex, index);
              const isActive = offset === 0;

              return (
                <article
                  key={review.productId}
                  className="redesign-home-review-card"
                  data-active={isActive}
                  data-position={offset}
                  aria-label={`${review.productLabel[locale]} — ${review.exampleLabel[locale]}`}
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
                  <p className="redesign-home-review-example-label">{review.exampleLabel[locale]}</p>
                  <blockquote>{review.quote[locale]}</blockquote>
                </article>
              );
            })}
          </div>
        </div>
        <div className="redesign-home-reviews-controls">
          <button type="button" className="redesign-home-reviews-control" onClick={() => move(-1)} aria-label={copy.previous}>
            <ArrowLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="redesign-home-reviews-control"
            onClick={togglePause}
            aria-label={isPaused ? copy.resume : copy.pause}
            aria-pressed={isPaused}
          >
            {isPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
          <button type="button" className="redesign-home-reviews-control" onClick={() => move(1)} aria-label={copy.next}>
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
