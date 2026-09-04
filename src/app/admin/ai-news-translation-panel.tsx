"use client";

import { useActionState, useEffect } from "react";
import { generateAiNewsEnglishDraftAction } from "@/app/admin/actions";

export type AiNewsTranslationActionData = {
  englishTitle: string;
  englishSubtitle: string;
  englishSummary: string;
  englishContent: string;
  englishKeyTakeaways: string[];
  englishImpactNotes: string;
  englishConclusion: string;
  englishDescription: string;
  englishSeoTitle: string;
  englishSeoDescription: string;
  englishKeywords: string;
  englishSeoKeywords: string;
};

export type AiNewsTranslationActionState = {
  ok: boolean;
  message: string;
  data?: AiNewsTranslationActionData;
};

const initialState: AiNewsTranslationActionState = {
  ok: false,
  message: ""
};

export function AiNewsTranslationPanel({
  onTranslated
}: {
  onTranslated: (data: AiNewsTranslationActionData) => void;
}) {
  const [state, formAction, pending] = useActionState<AiNewsTranslationActionState, FormData>(
    generateAiNewsEnglishDraftAction,
    initialState
  );

  useEffect(() => {
    if (state.ok && state.data) {
      onTranslated(state.data);
    }
  }, [state, onTranslated]);

  return (
    <div className="rounded-2xl border border-white/12 bg-white/6 p-4 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--marketing-text)]">English Content</p>
          <p className="mt-1 text-xs text-[var(--marketing-muted)]">
            Generate English title, summary, content, takeaways, and SEO fields from the current Chinese draft.
          </p>
        </div>
        <button
          type="submit"
          formAction={formAction}
          className="rounded-full border border-white/14 px-4 py-2 text-sm font-semibold text-[var(--marketing-text)] transition hover:border-[var(--marketing-accent)] hover:text-[var(--marketing-accent)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
        >
          {pending ? "Generating..." : "Generate English Content"}
        </button>
      </div>

      {state.message ? (
        <p
          className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
            state.ok
              ? "border-[#5EF1C7]/30 bg-[#5EF1C7]/10 text-[#5EF1C7]"
              : "border-red-400/30 bg-red-400/10 text-red-100"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
