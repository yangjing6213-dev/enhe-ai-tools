"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/dictionaries";
import { buildLanguageSwitcherHref, buildLocalePath } from "@/lib/seo";
import { MobileNavMenu } from "@/components/mobile-nav-menu";
import { type HeaderSessionUser, useHeaderSessionUser } from "@/components/header-session";

export function HeaderSessionGate({
  locale,
  labels,
  navItems,
  initialUser
}: {
  locale: Locale;
  labels: {
    admin: string;
    login: string;
    menu: string;
    user: string;
    zh: string;
    en: string;
  };
  navItems: ReadonlyArray<{ label: string; href: string }>;
  initialUser: HeaderSessionUser | null;
}) {
  const { user } = useHeaderSessionUser(initialUser);
  const pathname = usePathname() ?? "/";
  const languageItems = (["zh", "en"] as const).map((item) => ({
    label: locale === "en" && item === "zh" ? "ZH" : labels[item],
    href: buildLanguageSwitcherHref(pathname, item),
    locale: item,
    active: locale === item
  }));

  return (
    <MobileNavMenu
      labels={{ menu: labels.menu, admin: labels.admin }}
      navItems={navItems}
      showAdmin={user?.role === "admin"}
      loginItem={[labels.login, buildLocalePath("/login", locale)]}
      userCenterItem={[labels.user, buildLocalePath("/user", locale)]}
      languageItems={languageItems}
    />
  );
}
