"use client";

import { useRef } from "react";

export function EnheRedesignSoftwareRail({
  ariaLabel,
  className,
  children,
  "data-horizontal-cards": railType,
}: {
  ariaLabel: string;
  className: string;
  children: React.ReactNode;
  "data-horizontal-cards": "new" | "featured";
}) {
  const railRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={railRef}
      className={className}
      role="region"
      tabIndex={0}
      aria-label={ariaLabel}
      data-horizontal-cards={railType}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
          return;
        }

        const rail = railRef.current;

        if (!rail) {
          return;
        }

        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        rail.scrollBy({
          left: direction * Math.max(240, rail.clientWidth * 0.8),
          behavior: "auto",
        });
      }}
    >
      {children}
    </div>
  );
}
