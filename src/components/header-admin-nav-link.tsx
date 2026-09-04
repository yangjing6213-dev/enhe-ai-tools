"use client";

import { PrefetchLink } from "@/components/prefetch-link";
import type { Locale } from "@/lib/dictionaries";
import { type HeaderSessionUser, useHeaderSessionUser } from "@/components/header-session";

export function HeaderAdminNavLink({
  locale: _locale,
  label,
  initialUser
}: {
  locale: Locale;
  label: string;
  initialUser: HeaderSessionUser | null;
}) {
  const { user } = useHeaderSessionUser(initialUser);

  if (user?.role !== "admin") return null;

  return (
    <PrefetchLink href="/admin" className="site-nav-link cursor-target">
      {label}
    </PrefetchLink>
  );
}
