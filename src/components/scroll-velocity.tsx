"use client";

import {
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  motion
} from "motion/react";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

type VelocityMapping = {
  input: [number, number];
  output: [number, number];
};

type VelocityTextProps = {
  children: ReactNode;
  baseVelocity: number;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  className?: string;
  damping?: number;
  stiffness?: number;
  numCopies?: number;
  velocityMapping?: VelocityMapping;
  parallaxClassName?: string;
  scrollerClassName?: string;
  parallaxStyle?: CSSProperties;
  scrollerStyle?: CSSProperties;
  reduceMotion?: boolean;
};

type ScrollVelocityProps = {
  scrollContainerRef?: RefObject<HTMLElement | null>;
  texts?: ReactNode[];
  velocity?: number;
  className?: string;
  damping?: number;
  stiffness?: number;
  numCopies?: number;
  velocityMapping?: VelocityMapping;
  parallaxClassName?: string;
  scrollerClassName?: string;
  parallaxStyle?: CSSProperties;
  scrollerStyle?: CSSProperties;
};

function useElementWidth<T extends HTMLElement>(ref: RefObject<T | null>): number {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    function updateWidth() {
      if (ref.current) {
        setWidth(ref.current.offsetWidth);
      }
    }

    updateWidth();
    window.addEventListener("resize", updateWidth);

    return () => window.removeEventListener("resize", updateWidth);
  }, [ref]);

  return width;
}

function useReducedMotionPreference() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);

    update();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }

    query.addListener(update);

    return () => query.removeListener(update);
  }, []);

  return reduceMotion;
}

function wrap(min: number, max: number, value: number): number {
  const range = max - min;
  const mod = (((value - min) % range) + range) % range;

  return mod + min;
}

function VelocityText({
  children,
  baseVelocity,
  scrollContainerRef,
  className = "",
  damping,
  stiffness,
  numCopies,
  velocityMapping,
  parallaxClassName,
  scrollerClassName,
  parallaxStyle,
  scrollerStyle,
  reduceMotion
}: VelocityTextProps) {
  const baseX = useMotionValue(0);
  const scrollOptions = scrollContainerRef ? { container: scrollContainerRef } : {};
  const { scrollY } = useScroll(scrollOptions);
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: damping ?? 50,
    stiffness: stiffness ?? 400
  });
  const velocityFactor = useTransform(
    smoothVelocity,
    velocityMapping?.input || [0, 1000],
    velocityMapping?.output || [0, 5],
    { clamp: false }
  );

  const copyRef = useRef<HTMLSpanElement>(null);
  const copyWidth = useElementWidth(copyRef);

  const x = useTransform(baseX, (value) => {
    if (copyWidth === 0) return "0px";

    return `${wrap(-copyWidth, 0, value)}px`;
  });

  const directionFactor = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduceMotion) return;

    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

    if (velocityFactor.get() < 0) {
      directionFactor.current = -1;
    } else if (velocityFactor.get() > 0) {
      directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  const copies = [];

  for (let i = 0; i < (numCopies ?? 6); i++) {
    copies.push(
      <span className={className} key={i} ref={i === 0 ? copyRef : null}>
        {children}&nbsp;
      </span>
    );
  }

  if (reduceMotion) {
    return (
      <div className={parallaxClassName} style={parallaxStyle}>
        <div className={scrollerClassName} style={scrollerStyle}>
          <span className={className}>{children}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={parallaxClassName} style={parallaxStyle}>
      <motion.div className={scrollerClassName} style={{ x, ...scrollerStyle }}>
        {copies}
      </motion.div>
    </div>
  );
}

// Adapted from React Bits ScrollVelocity, licensed MIT + Commons Clause.
export function ScrollVelocity({
  scrollContainerRef,
  texts = [],
  velocity = 100,
  className = "",
  damping = 50,
  stiffness = 400,
  numCopies = 6,
  velocityMapping = { input: [0, 1000], output: [0, 5] },
  parallaxClassName = "parallax",
  scrollerClassName = "scroller",
  parallaxStyle,
  scrollerStyle
}: ScrollVelocityProps) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <section>
      {texts.map((text, index) => (
        <VelocityText
          key={index}
          className={className}
          baseVelocity={index % 2 !== 0 ? -velocity : velocity}
          scrollContainerRef={scrollContainerRef}
          damping={damping}
          stiffness={stiffness}
          numCopies={numCopies}
          velocityMapping={velocityMapping}
          parallaxClassName={parallaxClassName}
          scrollerClassName={scrollerClassName}
          parallaxStyle={parallaxStyle}
          scrollerStyle={scrollerStyle}
          reduceMotion={reduceMotion}
        >
          {text}
        </VelocityText>
      ))}
    </section>
  );
}
