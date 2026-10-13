"use client";

import { useEffect, useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
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

  return <LanguageToggle compact locale={currentLocale} hrefs={currentHrefs} label={ariaLabel} className="redesign-language-switch" />;
}