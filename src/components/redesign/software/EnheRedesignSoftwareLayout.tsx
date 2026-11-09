"use client";

import { useLayoutEffect, useRef, type ComponentPropsWithoutRef } from "react";

export function EnheRedesignSoftwareLayout(props: ComponentPropsWithoutRef<"main">) {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let frame = 0;
    let rootWidth = root.getBoundingClientRect().width;
    const observedContent = new Set<Element>();
    const heightProperty = "--redesign-software-card-height";

    function measure() {
      frame = 0;
      if (!root) return;
      // Reset first so a wider viewport or a shorter filtered result can shrink again.
      root.style.removeProperty(heightProperty);
      const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-catalog-card]"))
        .filter((card) => card.getClientRects().length > 0);
      const height = Math.max(0, ...cards.map((card) => card.getBoundingClientRect().height));
      if (height) root.style.setProperty(heightProperty, `${Math.ceil(height)}px`);
    }

    function scheduleMeasure() {
      if (!frame) frame = requestAnimationFrame(measure);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === root) {
          const width = root.getBoundingClientRect().width;
          if (width === rootWidth) continue;
          rootWidth = width;
        }
        scheduleMeasure();
      }
    });

    function observeContent() {
      if (!root) return;
      // Observe intrinsic content, not stretched cards/bodies, to avoid feedback from our height.
      const content = new Set(root.querySelectorAll(
        ".redesign-software-card-frame, .redesign-software-card-body > *, .redesign-software-card > .card-like-action",
      ));
      for (const element of observedContent) {
        if (!content.has(element)) {
          resizeObserver.unobserve(element);
          observedContent.delete(element);
        }
      }
      for (const element of content) {
        if (!observedContent.has(element)) {
          resizeObserver.observe(element);
          observedContent.add(element);
        }
      }
    }

    const mutationObserver = new MutationObserver(() => {
      observeContent();
      scheduleMeasure();
    });
    mutationObserver.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["hidden"],
    });
    resizeObserver.observe(root);
    observeContent();
    measure();

    return () => {
      cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      root.style.removeProperty(heightProperty);
    };
  }, []);

  return <main {...props} ref={rootRef} />;
}
