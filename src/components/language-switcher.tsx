"use client";

import { LanguageToggle } from "@/components/language-toggle";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/dictionaries";
import { buildLanguageSwitcherHref } from "@/lib/seo";

export function LanguageSwitcher({
  locale,
  labels
}: {
  locale: Locale;
  labels: { label: string; zh: string; en: string };
}) {
  const pathname = usePathname() ?? "/";

  return <span className="hidden sm:flex"><LanguageToggle locale={locale} label={labels.label} zhLabel={locale === "en" ? "ZH" : labels.zh} hrefs={{zh: buildLanguageSwitcherHref(pathname, "zh"), en: buildLanguageSwitcherHref(pathname, "en")}} className="site-language-switcher" /></span>;
}
