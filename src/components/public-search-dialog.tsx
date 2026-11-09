"use client";

import { ArrowUpRight, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";
import type { FormEvent } from "react";
import { PrefetchLink } from "@/components/prefetch-link";
import type {
  PublicSearchResult,
  PublicSearchResultType,
} from "@/lib/public-search";

const SearchStrands = dynamic(
  () => import("@/components/search/search-strands.client"),
  {
    ssr: false,
    loading: () => <div className="public-search-strands-static" />,
  },
);

type PublicSearchDialogProps = {
  searchPath: string;
  homePath: string;
  query: string;
  results: PublicSearchResult[];
  failed: boolean;
  labels: {
    title: string;
    inputLabel: string;
    placeholder: string;
    submit: string;
    close: string;
    loading: string;
    initialText: string;
    emptyText: string;
    errorText: string;
    resultCount: string;
    types: Record<PublicSearchResultType, string>;
  };
};

export function PublicSearchDialog({
  searchPath,
  homePath,
  query,
  results,
  failed,
  labels,
}: PublicSearchDialogProps) {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const { emptyText, errorText } = labels;

  const closeDialog = useCallback(() => {
    router.push(homePath);
  }, [homePath, router]);

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
      if (event.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        ).filter((element) => element.offsetParent !== null);
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDialog]);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const interactivePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    const restingPoint = { x: 0.5, y: 0.3 };
    const target = { ...restingPoint };
    const current = { ...restingPoint };
    let frameId = 0;

    const renderPointer = () => {
      frameId = 0;
      current.x += (target.x - current.x) * 0.09;
      current.y += (target.y - current.y) * 0.09;

      page.style.setProperty("--search-pointer-x", `${current.x * 100}%`);
      page.style.setProperty("--search-pointer-y", `${current.y * 100}%`);
      page.style.setProperty("--search-parallax-x", `${(current.x - 0.5) * 16}px`);
      page.style.setProperty("--search-parallax-y", `${(current.y - 0.3) * 12}px`);

      if (
        Math.abs(target.x - current.x) > 0.0005 ||
        Math.abs(target.y - current.y) > 0.0005
      ) {
        frameId = window.requestAnimationFrame(renderPointer);
      }
    };

    const queuePointerRender = () => {
      if (!frameId) frameId = window.requestAnimationFrame(renderPointer);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!interactivePointer.matches) return;
      const rect = page.getBoundingClientRect();
      target.x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
      target.y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
      queuePointerRender();
    };

    const resetPointer = () => {
      target.x = restingPoint.x;
      target.y = restingPoint.y;
      queuePointerRender();
    };

    const handleInteractionModeChange = () => {
      if (!interactivePointer.matches) resetPointer();
    };

    page.addEventListener("pointermove", handlePointerMove, { passive: true });
    page.addEventListener("pointerleave", resetPointer);
    interactivePointer.addEventListener("change", handleInteractionModeChange);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      page.removeEventListener("pointermove", handlePointerMove);
      page.removeEventListener("pointerleave", resetPointer);
      interactivePointer.removeEventListener("change", handleInteractionModeChange);
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextQuery = String(formData.get("q") ?? "").trim();
    const nextUrl = nextQuery
      ? `${searchPath}?${new URLSearchParams({ q: nextQuery }).toString()}`
      : searchPath;
    startTransition(() => router.push(nextUrl));
  }

  const statusText = failed
    ? errorText
    : isPending
      ? labels.loading
      : query
        ? results.length
          ? labels.resultCount.replace("{count}", String(results.length))
          : emptyText
        : labels.initialText;

  return (
    <div ref={pageRef} className="public-search-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="public-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-search-title"
      >
        <div className="public-search-toolbar">
          <button
            type="button"
            className="public-search-close cursor-target"
            aria-label={labels.close}
            title={labels.close}
            onClick={closeDialog}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="public-search-strands-stage" aria-hidden="true">
          <SearchStrands />
        </div>

        <h1 id="public-search-title" className="sr-only">
          {labels.title}
        </h1>

        <form
          className="public-search-form enhe-search-surface"
          action={searchPath}
          method="get"
          role="search"
          onSubmit={handleSubmit}
        >
          <label className="sr-only" htmlFor="public-search-input">
            {labels.inputLabel}
          </label>
          <Search size={20} aria-hidden="true" />
          <input
            ref={inputRef}
            id="public-search-input"
            name="q"
            type="search"
            defaultValue={query}
            placeholder={labels.placeholder}
            maxLength={80}
            autoComplete="off"
          />
          <button type="submit" className="public-search-submit cursor-target">
            <Search size={17} aria-hidden="true" />
            <span>{labels.submit}</span>
          </button>
        </form>

        <p className="public-search-status tabular-nums" aria-live="polite">
          {statusText}
        </p>

        {!failed && results.length ? (
          <div className="public-search-results">
            {results.map((result) => (
              <PrefetchLink
                key={result.id}
                href={result.href}
                className="public-search-result cursor-target"
              >
                <span className="public-search-result-type">
                  {labels.types[result.type]}
                </span>
                <span className="public-search-result-copy">
                  <strong>{result.title}</strong>
                  <small>{result.excerpt}</small>
                </span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </PrefetchLink>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
