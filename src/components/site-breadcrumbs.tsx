"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getPageBreadcrumbs,
  getStructuredBreadcrumbs,
  normalizeBreadcrumbTitle,
  type SiteBreadcrumb,
} from "@/lib/site-breadcrumbs";

type SiteBreadcrumbsProps = {
  locale: "zh" | "en";
};

export function SiteBreadcrumbs({ locale }: SiteBreadcrumbsProps) {
  const pathname = usePathname() ?? "/";
  const fallback = useMemo(() => getPageBreadcrumbs(pathname, locale), [locale, pathname]);
  const [resolved, setResolved] = useState<{ pathname: string; items: SiteBreadcrumb[] } | null>(null);
  const items = resolved?.pathname === pathname ? resolved.items : fallback;

  useEffect(() => {
    const pageTitle = normalizeBreadcrumbTitle(document.title);
    const jsonLdTexts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map((script) => script.textContent ?? "");
    const structured = getStructuredBreadcrumbs(jsonLdTexts, pathname, window.location.origin);
    setResolved({
      pathname,
      items: structured ?? getPageBreadcrumbs(pathname, locale, pageTitle),
    });
  }, [locale, pathname]);

  if (pathname === "/" || pathname === "/en" || pathname === "/en/") return null;

  return (
    <nav className="site-breadcrumbs" aria-label={locale === "en" ? "Breadcrumb" : "面包屑导航"}>
      <ol>
        {items.map((item, index) => (
          <li key={`${item.href}-${index}`}>
            {index > 0 && <ChevronRight className="site-breadcrumbs-separator" aria-hidden="true" />}
            {item.current ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <Link href={item.href} prefetch={false}>{item.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
