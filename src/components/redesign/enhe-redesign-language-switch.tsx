"use client";

import { useEffect, useState } from "react";
import { newsListingNavigationEvent } from "@/lib/ai-news-listing";
import type { RedesignLanguageHrefs, RedesignLocale } from "./types";

export function EnheRedesignLanguageSwitch({
  localeHrefs,
  currentLocale,
  ariaLabel,
}: {
  localeHrefs: RedesignLanguageHrefs;
  currentLocale: RedesignLocale;
  ariaLabel: string;
}) {
  const [currentHrefs, setCurrentHrefs] = useState(localeHrefs);
  useEffect(() => {
    setCurrentHrefs(localeHrefs);
    const updateHrefs = (event: Event) => {
      setCurrentHrefs((event as CustomEvent<RedesignLanguageHrefs>).detail);
    };
    window.addEventListener(newsListingNavigationEvent, updateHrefs);
    return () => window.removeEventListener(newsListingNavigationEvent, updateHrefs);
  }, [localeHrefs]);

  const selectLocale = (locale: RedesignLocale) => {
    document.cookie = `enhe_locale=${locale}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <span className="redesign-language-switch" aria-label={ariaLabel}>
      <a
        className="redesign-language-link"
        href={currentHrefs.zh}
        onClick={() => selectLocale("zh")}
        aria-current={currentLocale === "zh" ? "page" : undefined}
        lang="zh"
      >
        中文
      </a>
      <span className="redesign-language-separator" aria-hidden="true">
        /
      </span>
      <a
        className="redesign-language-link"
        href={currentHrefs.en}
        onClick={() => selectLocale("en")}
        aria-current={currentLocale === "en" ? "page" : undefined}
        lang="en"
      >
        EN
      </a>
    </span>
  );
}
