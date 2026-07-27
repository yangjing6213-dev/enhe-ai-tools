"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, type MouseEvent, type ReactNode } from "react";
import type { ProductDemoFilter } from "@/lib/product-demos";
import { loadGsapFlip } from "@/lib/gsap-runtime";

type FlipState = ReturnType<(typeof import("gsap/Flip"))["Flip"]["getState"]>;
type GsapFlipRuntime = Awaited<ReturnType<typeof loadGsapFlip>>;
type GsapTimeline = ReturnType<GsapFlipRuntime["gsap"]["timeline"]>;

type ProductDemoFilterLink = {
  value: ProductDemoFilter;
  label: string;
  href: string;
};

type ProductDemoFilterItem = {
  id: string;
  content: ReactNode;
};

type ProductDemoFilterGridProps = {
  activeCategory: ProductDemoFilter;
  filters: readonly ProductDemoFilterLink[];
  items: readonly ProductDemoFilterItem[];
  emptyState: ReactNode;
  filterAriaLabel: string;
};

const finePointerQuery = "(hover: hover) and (pointer: fine)";
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

export function ProductDemoFilterGrid({
  activeCategory,
  filters,
  items,
  emptyState,
  filterAriaLabel,
}: ProductDemoFilterGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<GsapFlipRuntime | null>(null);
  const activeFlipRef = useRef<GsapTimeline | null>(null);
  const previousStateRef = useRef<FlipState | null>(null);

  const captureCurrentState = useCallback(() => {
    const grid = gridRef.current;
    const runtime = runtimeRef.current;
    const currentItems = grid?.querySelectorAll<HTMLElement>("[data-product-demo-item]");
    const shouldAnimate =
      Boolean(runtime) &&
      Boolean(currentItems?.length) &&
      window.matchMedia(finePointerQuery).matches &&
      !window.matchMedia(reducedMotionQuery).matches;

    activeFlipRef.current?.kill();
    previousStateRef.current = shouldAnimate && runtime && currentItems
      ? runtime.Flip.getState(currentItems)
      : null;
  }, []);

  useEffect(() => {
    let isActive = true;
    void loadGsapFlip()
      .then((runtime) => {
        if (isActive) runtimeRef.current = runtime;
      })
      .catch(() => {
        runtimeRef.current = null;
      });
    return () => {
      isActive = false;
      runtimeRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const previousState = previousStateRef.current;
    const runtime = runtimeRef.current;
    previousStateRef.current = null;
    const nextItems = gridRef.current?.querySelectorAll<HTMLElement>("[data-product-demo-item]");
    if (!runtime || !previousState || !nextItems?.length) return;

    activeFlipRef.current = runtime.Flip.from(previousState, {
      targets: nextItems,
      absolute: true,
      fade: true,
      prune: true,
      duration: 0.48,
      ease: "power2.inOut",
      stagger: 0.035,
      onComplete: () => {
        activeFlipRef.current = null;
      },
    });
  }, [activeCategory, items]);

  const handleFilterClick = useCallback((event: MouseEvent<HTMLAnchorElement>, nextCategory: ProductDemoFilter) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (nextCategory === activeCategory) return;
    captureCurrentState();
  }, [activeCategory, captureCurrentState]);

  useEffect(() => {
    const handlePopState = () => captureCurrentState();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [captureCurrentState]);

  useEffect(() => () => {
    activeFlipRef.current?.kill();
  }, []);

  return (
    <>
      <nav className="product-demo-filter-bar" aria-label={filterAriaLabel}>
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={filter.href}
            scroll={false}
            className={filter.value === activeCategory ? "is-active" : ""}
            aria-current={filter.value === activeCategory ? "page" : undefined}
            onClick={(event) => handleFilterClick(event, filter.value)}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
      <div ref={gridRef} className="product-demo-list-grid" data-active-category={activeCategory}>
        {items.map((item) => (
          <div
            key={item.id}
            className="product-demo-list-item"
            data-product-demo-item
            data-flip-id={`product-demo-${item.id}`}
          >
            {item.content}
          </div>
        ))}
      </div>
      {items.length ? null : emptyState}
    </>
  );
}
