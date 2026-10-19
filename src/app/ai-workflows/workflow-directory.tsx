"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ChartNoAxesColumnIncreasing,
  Code2,
  GraduationCap,
  HeartHandshake,
  PanelsTopLeft,
  Scale,
  Search,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";

import type { RedesignLocale } from "@/components/redesign/types";
import { EmptyState } from "@/components/ui";
import { AI_WORKFLOW_CATEGORIES, filterAiWorkflowCategories, type AiWorkflowCategory } from "./workflow-catalog";

const categoryIcons: Record<AiWorkflowCategory["icon"], LucideIcon> = {
  briefcase: BriefcaseBusiness,
  video: Video,
  sparkles: Sparkles,
  code: Code2,
  graduation: GraduationCap,
  search: Search,
  chart: ChartNoAxesColumnIncreasing,
  panels: PanelsTopLeft,
  heart: HeartHandshake,
  scale: Scale,
};

const copy = {
  zh: {
    search: "搜索应用方向或任务",
    directions: "按应用方向浏览",
    resultSuffix: "个方向",
    emptyTitle: "没有找到相关方向",
    emptyText: "换一个任务关键词试试。",
    comingTitle: "首批 AI 工作流尚未完成发布核验",
    comingText: "项目来源、许可证、运行条件和实际交付内容核验完成并正式发布后，这里才会展示具体项目、价格和评价。",
    browseSkills: "浏览 AI Skills",
    browseTools: "浏览 AI 工具",
  },
  en: {
    search: "Search directions or tasks",
    directions: "Browse by application area",
    resultSuffix: "directions",
    emptyTitle: "No matching direction found",
    emptyText: "Try another task keyword.",
    comingTitle: "The first AI workflows are not yet verified for publication",
    comingText: "Specific projects, prices, and reviews will appear here only after their source, license, runtime requirements, and deliverables have been checked and the items are published.",
    browseSkills: "Browse AI Skills",
    browseTools: "Browse AI tools",
  },
} as const;

export function AiWorkflowDirectory({ locale }: { locale: RedesignLocale }) {
  const [query, setQuery] = useState("");
  const text = copy[locale];
  const categories = useMemo(
    () => filterAiWorkflowCategories(AI_WORKFLOW_CATEGORIES, query, locale),
    [query, locale],
  );

  return (
    <>
      <section className="filter-surface mt-7 p-5" aria-label={text.directions}>
        <label className="sr-only" htmlFor="ai-workflow-direction-search">{text.search}</label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--marketing-muted)]" />
          <input
            id="ai-workflow-direction-search"
            type="search"
            value={query}
            placeholder={text.search}
            className="w-full rounded-xl border border-border bg-background py-3 pl-12 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </div>
      </section>

      <div className="mt-6 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-[var(--marketing-text)]">{text.directions}</h2>
        <p className="text-sm text-[var(--marketing-muted)]" role="status" aria-live="polite">
          {categories.length} {text.resultSuffix}
        </p>
      </div>

      {categories.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2" role="list" aria-label={text.directions}>
          {categories.map((category) => {
            const Icon = categoryIcons[category.icon];
            return (
              <article
                key={category.slug}
                className="flex min-h-28 items-start gap-4 rounded-2xl border border-[var(--marketing-border)] bg-white p-5 shadow-[0_12px_34px_rgba(29,78,126,0.06)]"
                role="listitem"
              >
                <span className="mt-0.5 inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[rgba(0,102,204,0.12)] text-[var(--marketing-accent)]">
                  <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
                </span>
                <div>
                  <h3 className="text-lg font-semibold leading-7 text-[var(--marketing-text)]">{category.label[locale]}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--marketing-muted)]">{category.examples[locale]}</p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState title={text.emptyTitle} text={text.emptyText} />
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-bg-soft)] p-6 sm:p-8" aria-labelledby="ai-workflows-coming-title">
        <h2 id="ai-workflows-coming-title" className="text-lg font-semibold text-[var(--marketing-text)]">{text.comingTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--marketing-muted)]">{text.comingText}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="text-sm font-medium text-[var(--marketing-accent)] underline-offset-4 hover:underline" href={locale === "en" ? "/en/ai-skills" : "/ai-skills"}>{text.browseSkills}</Link>
          <Link className="text-sm font-medium text-[var(--marketing-accent)] underline-offset-4 hover:underline" href={locale === "en" ? "/en/software" : "/software"}>{text.browseTools}</Link>
        </div>
      </section>
    </>
  );
}
