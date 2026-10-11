"use client";

import { useMemo, useState } from "react";

import { EnheRedesignSoftwareCard } from "@/components/redesign/software/EnheRedesignSoftwareCard";
import type { RedesignLocale } from "@/components/redesign/types";
import { EmptyState } from "@/components/ui";
import type { SoftwareCatalogItem } from "@/lib/redesign/software/software-production";

export type AiSkillCatalogEntry = {
  product: SoftwareCatalogItem;
  categoryLabel: string;
};

export function filterAiSkillCatalog(
  entries: ReadonlyArray<AiSkillCatalogEntry>,
  query: string,
  locale: RedesignLocale,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase(locale === "en" ? "en-US" : "zh-CN");
  if (!normalizedQuery) return entries;

  return entries.filter(({ product, categoryLabel }) =>
    [product.name, product.secondaryName, product.description, categoryLabel, ...product.highlights]
      .filter(Boolean)
      .some((value) =>
        value!.toLocaleLowerCase(locale === "en" ? "en-US" : "zh-CN").includes(normalizedQuery),
      ),
  );
}

export function AiSkillsCatalog({
  entries,
  locale,
  initialQuery,
  searchLabel,
  emptyTitle,
  emptyText,
}: {
  entries: ReadonlyArray<AiSkillCatalogEntry>;
  locale: RedesignLocale;
  initialQuery: string;
  searchLabel: string;
  emptyTitle: string;
  emptyText: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const visibleEntries = useMemo(
    () => filterAiSkillCatalog(entries, query, locale),
    [entries, query, locale],
  );
  const resultLabel = locale === "en"
    ? visibleEntries.length + (visibleEntries.length === 1 ? " AI Skill found" : " AI Skills found")
    : "找到 " + visibleEntries.length + " 个 AI Skill";

  return (
    <>
      <div className="filter-surface mt-7 p-5">
        <label className="sr-only" htmlFor="ai-skills-search">{searchLabel}</label>
        <input
          id="ai-skills-search"
          type="search"
          value={query}
          placeholder={searchLabel}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </div>

      <p className="mt-4 text-sm text-[var(--marketing-muted)]" role="status" aria-live="polite">
        {resultLabel}
      </p>

      {visibleEntries.length ? (
        <div className="redesign-software-grid redesign-software-grid-all mt-4" role="list" aria-label={locale === "en" ? "AI Skills" : "AI Skill 产品"}>
          {visibleEntries.map(({ product, categoryLabel }) => (
            <EnheRedesignSoftwareCard
              key={product.id}
              product={product}
              categoryLabel={categoryLabel}
              locale={locale}
              sectionId="all-products"
              listItem
            />
          ))}
        </div>
      ) : (
        <EmptyState title={emptyTitle} text={emptyText} />
      )}
    </>
  );
}
