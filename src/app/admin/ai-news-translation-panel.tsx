"use client";

import { useActionState, useEffect } from "react";
import { generateAiNewsEnglishDraftAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

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
    <div className="rounded-2xl border border-border bg-card p-4 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--marketing-text)]">English Content</p>
          <p className="mt-1 text-xs text-[var(--marketing-muted)]">
            Generate English title, summary, content, takeaways, and SEO fields from the current Chinese draft.
          </p>
        </div>
        <Button
          type="submit"
          formAction={formAction}
          variant="outline"
          className="h-10 rounded-full border-border px-4 text-sm font-semibold text-foreground hover:border-primary hover:text-primary"
          disabled={pending}
        >
          {pending ? "Generating..." : "Generate English Content"}
        </Button>
      </div>

      {state.message ? (
        <p
          className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
            state.ok
              ? "enhe-admin-translation-success border-emerald-600/30 bg-emerald-600/10"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
