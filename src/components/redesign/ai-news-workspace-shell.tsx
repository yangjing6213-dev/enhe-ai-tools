import React, { type ReactNode } from "react";
import type { Locale } from "@/lib/dictionaries";

const copy = {
  zh: {
    section: "AI资讯",
    latest: "最新资讯",
    topics: "专题集合",
  },
  en: {
    section: "AI News",
    latest: "Latest",
    topics: "Topics",
  },
} as const;

export function AiNewsWorkspaceShell({
  locale,
  currentPathname,
  children,
}: {
  locale: Locale;
  currentPathname?: string;
  children: ReactNode;
}) {
  const language = locale === "en" ? "en" : "zh";
  const t = copy[language];
  const prefix = language === "en" ? "/en" : "";
  const normalizedCurrentPathname = currentPathname?.replace(/\/+$/, "") || "";
  const localizedPath = normalizedCurrentPathname.replace(/^\/en(?=\/|$)/, "");
  const activeSection = localizedPath.match(/^\/ai-news\/topics(?:\/|$)/)
    ? "topics"
    : "latest";
  const navItems = [
    { key: "latest", href: `${prefix}/ai-news`, label: t.latest },
    { key: "topics", href: `${prefix}/ai-news/topics`, label: t.topics },
  ] as const;

  return (
    <div className="ai-news-section-shell">
      <nav className="ai-news-section-nav" aria-label={t.section}>
        {navItems.map(({ key, href, label }) => (
          <a
            key={key}
            href={href}
            aria-current={
              normalizedCurrentPathname === href.replace(/\/+$/, "")
                ? "page"
                : activeSection === key
                  ? "location"
                  : undefined
            }
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="ai-news-section-content">{children}</div>
    </div>
  );
}
