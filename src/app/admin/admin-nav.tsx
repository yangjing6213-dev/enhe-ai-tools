"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminNavGroup = {
  label: string;
  items: readonly (readonly [key: string, href: string])[];
};

export function AdminNav({
  groups,
  labels,
  ariaLabel
}: {
  groups: readonly AdminNavGroup[];
  labels: Record<string, string>;
  ariaLabel: string;
}) {
  const pathname = usePathname() ?? "/admin";
  let activeHref = "";
  for (const { items } of groups) {
    for (const [, href] of items) {
      const matches = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
      if (matches && href.length > activeHref.length) activeHref = href;
    }
  }

  return (
    <nav className="admin-nav w-full" aria-label={ariaLabel}>
      {groups.map(({ label, items }) => (
        <details key={label} open={items.some(([, href]) => href === activeHref)}>
          <summary className="min-h-11 cursor-pointer rounded-md px-3 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2">{label}</summary>
          <ul className="admin-nav-list flex list-none flex-col">
            {items.map(([key, href]) => {
              const isActive = href === activeHref;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`admin-nav-link flex w-full${isActive ? " is-active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {labels[key] ?? key}
                  </Link>
                </li>
              );
            })}
          </ul>
        </details>
      ))}
    </nav>
  );
}
