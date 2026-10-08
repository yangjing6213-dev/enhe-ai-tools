"use client";

import { Check, Copy, LoaderCircle, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/dictionaries";
import {
  filterAiPromptManagementPrompts,
  type AiPromptManagementDataset,
  type AiPromptManagementPrompt,
} from "@/lib/ai-prompt-management";

const labels = {
  zh: {
    search: "搜索提示词、用途、场景",
    all: "全部",
    copy: "复制提示词",
    copied: "已复制",
    copyError: "复制失败，请选中文本后手动复制。",
    taskContext: "补充你的任务背景",
    placeholder: "例如：用于小红书产品介绍，语气自然，突出省时间。",
    empty: "没有匹配内容，换一个关键词或分类。",
    loading: "正在加载提示词库",
    loadError: "提示词库加载失败，请刷新页面重试。",
    promptPreview: "提示词预览",
    bestFor: "适合",
    loadMore: "显示更多",
    results: "条结果",
  },
  en: {
    search: "Search prompts, use cases, or scenarios",
    all: "All",
    copy: "Copy prompt",
    copied: "Copied",
    copyError: "Copy failed. Select the text and copy it manually.",
    taskContext: "Add your task context",
    placeholder: "Example: for a product post, natural tone, focus on saving time.",
    empty: "No matching prompts. Try another keyword or category.",
    loading: "Loading prompt library",
    loadError: "The prompt library could not load. Refresh the page and try again.",
    promptPreview: "Prompt preview",
    bestFor: "Best for",
    loadMore: "Show more",
    results: "results",
  },
} as const;

const pageSize = 60;

export function AiPromptManagementWorkbench({
  locale,
  datasetPath,
}: {
  locale: Locale;
  datasetPath: string;
}) {
  const t = labels[locale];
  const [dataset, setDataset] = useState<AiPromptManagementDataset | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(t.all);
  const [selectedId, setSelectedId] = useState("");
  const [context, setContext] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [copyError, setCopyError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError(false);

    fetch(datasetPath, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Prompt data request failed: ${response.status}`);
        return response.json() as Promise<AiPromptManagementDataset>;
      })
      .then(setDataset)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError(true);
      });

    return () => controller.abort();
  }, [datasetPath]);

  const prompts = useMemo(
    () =>
      filterAiPromptManagementPrompts(dataset?.entries ?? [], {
        query,
        category,
        allLabel: t.all,
      }),
    [category, dataset?.entries, query, t.all],
  );
  const selected =
    prompts.find((prompt) => prompt.id === selectedId) ?? prompts[0] ?? null;
  const visiblePrompts = prompts.slice(0, visibleCount);
  const categories = [t.all, ...(dataset?.categories ?? [])];

  async function copyPrompt(prompt: AiPromptManagementPrompt) {
    const contextBlock = context.trim()
      ? locale === "en"
        ? `Additional context: ${context.trim()}`
        : `补充需求：${context.trim()}`
      : "";
    const text = [`# ${prompt.title}`, contextBlock, prompt.prompt]
      .filter(Boolean)
      .join("\n\n");
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(prompt.id);
      window.setTimeout(() => setCopiedId(""), 1400);
    } catch {
      setCopyError(true);
    }
  }

  if (!dataset && !loadError) {
    return (
      <div className="surface-panel-soft mt-8 flex items-center gap-3 p-6 text-sm font-bold text-[var(--marketing-muted)]">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        {t.loading}
      </div>
    );
  }

  if (loadError || !dataset) {
    return (
      <div className="surface-panel-soft mt-8 p-6 text-sm font-bold text-[var(--marketing-muted)]">
        {t.loadError}
      </div>
    );
  }

  return (
    <section
      className="mt-8 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]"
      aria-label={locale === "en" ? "AI prompt workspace" : "AI 提示词工作台"}
    >
      <aside className="surface-panel-soft p-4">
        <label
          className="block text-sm font-bold text-[var(--marketing-text)]"
          htmlFor="ai-prompt-search"
        >
          {t.search}
        </label>
        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#687181]"
            aria-hidden="true"
          />
          <input
            id="ai-prompt-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(pageSize);
            }}
            className="w-full rounded-lg border border-[var(--marketing-border)] bg-white py-3 pl-10 pr-4 text-sm text-[#15171c] outline-none focus:border-[var(--marketing-accent)]"
            placeholder={t.search}
          />
        </div>
        <p
          className="mt-3 text-xs font-bold text-[var(--marketing-muted)]"
          aria-live="polite"
        >
          {prompts.length} {t.results}
        </p>
        <div className="mt-4 grid max-h-[620px] gap-2 overflow-auto pr-1">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setCategory(item);
                setSelectedId("");
                setCopyError(false);
                setVisibleCount(pageSize);
              }}
              aria-pressed={category === item}
              className={
                category === item
                  ? "rounded-lg border border-[var(--marketing-accent)] bg-[var(--marketing-accent)] px-3 py-2 text-left text-sm font-black text-primary-foreground"
                  : "rounded-lg border border-transparent px-3 py-2 text-left text-sm font-bold text-[var(--marketing-muted)] hover:border-[var(--marketing-border)] hover:text-[var(--marketing-text)]"
              }
            >
              {item}
            </button>
          ))}
        </div>
      </aside>

      <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.25fr)]">
        <div className="grid max-h-[760px] content-start gap-3 overflow-auto pr-1">
          {visiblePrompts.length ? (
            visiblePrompts.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                onClick={() => {
                  setSelectedId(prompt.id);
                  setCopyError(false);
                }}
                aria-pressed={selected?.id === prompt.id}
                className={
                  selected?.id === prompt.id
                    ? "rounded-lg border border-[var(--marketing-accent)] bg-white p-4 text-left shadow-[0_18px_38px_rgba(15,118,110,0.14)]"
                    : "rounded-lg border border-[var(--marketing-border)] bg-white/72 p-4 text-left hover:border-[var(--marketing-accent)]"
                }
              >
                <span className="text-xs font-black text-[#0f766e]">
                  {prompt.category}
                </span>
                <strong className="mt-2 block text-base text-[#15171c]">
                  {prompt.title}
                </strong>
                <span className="mt-2 block text-sm leading-6 text-[#5d6675]">
                  {prompt.summary}
                </span>
              </button>
            ))
          ) : (
            <div className="surface-panel-soft p-6 text-sm text-[var(--marketing-muted)]">
              {t.empty}
            </div>
          )}
          {visibleCount < prompts.length ? (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + pageSize)}
              className="rounded-lg border border-[var(--marketing-border)] bg-white px-4 py-3 text-sm font-black text-[var(--marketing-text)] hover:border-[var(--marketing-accent)]"
            >
              {t.loadMore}
            </button>
          ) : null}
        </div>

        <article className="surface-panel min-w-0 p-5">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-[var(--marketing-accent)]">
                    {selected.category}
                  </p>
                  <h2 className="mt-2 break-words text-2xl font-black tracking-normal text-[var(--marketing-text)]">
                    {selected.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => copyPrompt(selected)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#111318] px-4 py-3 text-sm font-black text-white"
                >
                  {copiedId === selected.id ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <Copy className="size-4" aria-hidden="true" />
                  )}
                  {copiedId === selected.id ? t.copied : t.copy}
                </button>
                <span className="sr-only" aria-live="polite">
                  {copiedId === selected.id ? t.copied : copyError ? t.copyError : ""}
                </span>
              </div>

              <p className="mt-4 text-sm leading-7 text-[var(--marketing-muted)]">
                {selected.summary}
              </p>

              <label className="mt-5 block">
                <span className="text-sm font-bold text-[var(--marketing-text)]">
                  {t.taskContext}
                </span>
                <textarea
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder={t.placeholder}
                  className="mt-3 min-h-24 w-full rounded-lg border border-[var(--marketing-border)] bg-white px-4 py-3 text-sm leading-7 text-[#15171c] outline-none focus:border-[var(--marketing-accent)]"
                />
              </label>

              <div className="mt-5">
                <p className="text-sm font-black text-[var(--marketing-text)]">
                  {t.promptPreview}
                </p>
                <pre
                  className="mt-3 max-h-[460px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--marketing-border)] bg-[#f8fafc] p-4 text-sm leading-7 text-[#15171c]"
                  tabIndex={0}
                  aria-label={t.promptPreview}
                >
                  {selected.prompt}
                </pre>
              </div>

              {copyError ? (
                <p className="mt-3 text-sm font-bold text-[#b42318]" role="alert">
                  {t.copyError}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-lg border border-[var(--marketing-border)] px-3 py-1 text-xs font-bold text-[var(--marketing-muted)]">
                  {t.bestFor}
                </span>
                {selected.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg bg-[var(--marketing-accent)]/10 px-3 py-1 text-xs font-bold text-[var(--marketing-accent)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--marketing-muted)]">{t.empty}</p>
          )}
        </article>
      </div>
    </section>
  );
}
