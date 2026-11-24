"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { PublicNavLink } from "@/components/public-nav-link";
import { cn } from "@/lib/utils";

type PublicNavDropdownProps = {
  href: string;
  label: string;
  children: ReactNode;
};

export function PublicNavDropdown({
  href,
  label,
  children,
}: PublicNavDropdownProps) {
  const [dismissed, setDismissed] = useState(false);

  function dismissAfterSelection(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest("a");
    if (!link || !event.currentTarget.contains(link)) return;

    setDismissed(true);
    link.blur();
  }

  return (
    <div className={cn("site-nav-dropdown", dismissed && "is-dismissed")}>
      <PublicNavLink
        href={href}
        className="site-nav-link site-nav-dropdown-trigger cursor-target"
        onPointerEnter={() => setDismissed(false)}
        onFocus={() => setDismissed(false)}
      >
        <span>{label}</span>
      </PublicNavLink>
      <div
        className="site-nav-dropdown-panel"
        aria-hidden={dismissed ? true : undefined}
        inert={dismissed ? true : undefined}
        onClick={dismissAfterSelection}
      >
        {children}
      </div>
    </div>
  );
}
