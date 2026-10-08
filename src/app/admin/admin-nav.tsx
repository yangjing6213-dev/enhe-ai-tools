"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

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
    <NavigationMenu
      className="admin-nav w-full max-w-none flex-col items-stretch justify-start"
      orientation="vertical"
      aria-label={ariaLabel}
      viewport={false}
    >
      <NavigationMenuList className="admin-nav-list flex-col items-stretch justify-start">
        {items.map(([key, href], index) => {
          const isActive = index === activeIndex;

          return (
            <NavigationMenuItem key={href} className="w-full">
              <NavigationMenuLink asChild>
                <Link
                  href={href}
                  className={`admin-nav-link${isActive ? " is-active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {labels[key] ?? key}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
