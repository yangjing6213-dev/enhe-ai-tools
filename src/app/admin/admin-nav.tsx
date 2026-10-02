"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminNavItem = readonly [key: string, href: string];

export function AdminNav({
  items,
  labels,
  ariaLabel
}: {
  items: readonly AdminNavItem[];
  labels: Record<string, string>;
  ariaLabel: string;
}) {
  const pathname = usePathname() ?? "/admin";
  const activeIndex = items.reduce<number>((currentIndex, [, href], index) => {
    const isPathMatch = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

    if (!isPathMatch) return currentIndex;
    if (currentIndex === -1 || href.length > items[currentIndex][1].length) return index;
    return currentIndex;
  }, -1);

  return (
    <nav className="admin-nav" aria-label={ariaLabel}>
      {items.map(([key, href], index) => {
        const isActive = index === activeIndex;

        return (
          <Link
            key={href}
            href={href}
            className={`admin-nav-link${isActive ? " is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {labels[key] ?? key}
          </Link>
        );
      })}
    </nav>
  );
}
