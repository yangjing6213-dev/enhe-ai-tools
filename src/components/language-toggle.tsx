"use client";

import { useEffect, useRef, useState } from "react";
import SquishSwitch from "@/components/SquishSwitch";
import "./language-toggle.css";

export function LanguageToggle({ locale, hrefs, label, className = "", zhLabel = "中文" }: {
  locale: "zh" | "en"; hrefs: { zh: string; en: string }; label: string; className?: string; zhLabel?: string;
}) {
  const [checked, setChecked] = useState(locale === "en");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { setChecked(locale === "en"); }, [locale]);
  useEffect(() => () => clearTimeout(timer.current), []);
  function select(next: "zh" | "en") {
    document.cookie = `enhe_locale=${next}; path=/; max-age=31536000; samesite=lax`;
  }
  return <span className={`enhe-language-toggle ${className}`} aria-label={label}>
    <a className="redesign-language-link" href={hrefs.zh} lang="zh" aria-current={locale === "zh" ? "page" : undefined} onClick={() => select("zh")}>{zhLabel}</a>
    <span className="redesign-language-separator" aria-hidden="true">/</span>
    <SquishSwitch checked={checked} onChange={on => {
      setChecked(on);
      const next = on ? "en" : "zh";
      select(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => window.location.assign(hrefs[next]), 200);
    }} ariaLabel={locale === "en" ? "Switch language to Chinese" : "切换语言为英文"}
      trackColor="#27272a" trackOnColor="#27272a" thumbColor="#4e4e51" thumbOnColor="#4e4e51"
      width={76} height={38} radius={19} speed={50} stretch={36} hoverScale={1.035} colorDuration={320} />
    <a className="redesign-language-link" href={hrefs.en} lang="en" aria-current={locale === "en" ? "page" : undefined} onClick={() => select("en")}>EN</a>
  </span>;
}
