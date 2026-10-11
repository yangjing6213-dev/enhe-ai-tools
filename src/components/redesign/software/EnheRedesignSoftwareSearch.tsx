"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import type { RedesignLocale } from "@/components/redesign/types";
import type { SoftwareLeafCategoryId } from "@/lib/redesign/software/software-categories";

export function EnheRedesignSoftwareSearch({
  locale,
  category,
  initialQuery,
}: {
  locale: RedesignLocale;
  category?: SoftwareLeafCategoryId;
  initialQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedQueries = useRef(new Set<string>());
  const searchLabel = locale === "en" ? "Search tool name or use case" : "搜索工具名称或用途";
  const basePath = locale === "en" ? "/en/software" : "/software";

  useEffect(() => {
    const restoreQuery = () => {
      if (timer.current) clearTimeout(timer.current);
      submittedQueries.current.clear();
      setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
    };
    window.addEventListener("popstate", restoreQuery);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("popstate", restoreQuery);
    };
  }, []);

  useEffect(() => {
    // Search responses must not replace newer text typed while a request was in flight.
    if (submittedQueries.current.has(initialQuery)) return;
    setQuery(initialQuery);
  }, [initialQuery]);

  function search(value: string) {
    const normalizedQuery = value.trim();
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (normalizedQuery) params.set("q", normalizedQuery);
    submittedQueries.current.add(normalizedQuery);
    startTransition(() => router.replace(params.size ? `${basePath}?${params}` : basePath, { scroll: false }));
  }

  return (
    <form
      className="redesign-software-search"
      role="search"
      aria-label={searchLabel}
      aria-busy={pending}
      action={basePath}
      onSubmit={(event) => {
        event.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        search(query);
      }}
    >
      <label className="sr-only" htmlFor="software-search">{searchLabel}</label>
      {category ? <input type="hidden" name="category" value={category} /> : null}
      <Input
        id="software-search"
        name="q"
        type="search"
        maxLength={200}
        value={query}
        placeholder={searchLabel}
        onChange={(event) => {
          const value = event.currentTarget.value;
          setQuery(value);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => search(value), 250);
        }}
      />
      {pending ? (
        <span className="sr-only" role="status" aria-live="polite">
          {locale === "en" ? "Searching" : "正在搜索"}
        </span>
      ) : null}
    </form>
  );
}
