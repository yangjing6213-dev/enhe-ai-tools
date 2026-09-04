"use client";

import Link from "next/link";
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

  return (
    <div className="site-language-switcher hidden items-center sm:flex" aria-label={labels.label}>
      {(["zh", "en"] as const).map((item) => (
        <Link
          key={item}
          href={buildLanguageSwitcherHref(pathname, item)}
          className={locale === item ? "is-active cursor-target" : "cursor-target"}
          onClick={() => {
            document.cookie = `enhe_locale=${item}; path=/; max-age=31536000; samesite=lax`;
          }}
        >
          {locale === "en" && item === "zh" ? "ZH" : labels[item]}
        </Link>
      ))}
    </div>
  );
}
