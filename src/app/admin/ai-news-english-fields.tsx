"use client";

import { useState } from "react";
import { AiNewsTranslationPanel } from "@/app/admin/ai-news-translation-panel";
import { Field, inputClass, textareaClass } from "@/app/admin/admin-ui";

type AiNewsEnglishFieldsProps = {
  article: {
    englishTitle?: string | null;
    englishSubtitle?: string | null;
    englishSummary?: string | null;
    englishContent?: string | null;
    englishKeyTakeaways: string[];
    englishImpactNotes?: string | null;
    englishConclusion?: string | null;
    englishSeoTitle?: string | null;
    englishDescription?: string | null;
    englishSeoDescription?: string | null;
    englishKeywords?: string | null;
    englishSeoKeywords?: string | null;
  } | null;
};

export function AiNewsEnglishFields({ article }: AiNewsEnglishFieldsProps) {
  const [englishTitle, setEnglishTitle] = useState(article?.englishTitle ?? "");
  const [englishSubtitle, setEnglishSubtitle] = useState(article?.englishSubtitle ?? "");
  const [englishSummary, setEnglishSummary] = useState(article?.englishSummary ?? "");
  const [englishContent, setEnglishContent] = useState(article?.englishContent ?? "");
  const [englishKeyTakeaways, setEnglishKeyTakeaways] = useState(article?.englishKeyTakeaways.join("\n") ?? "");
  const [englishImpactNotes, setEnglishImpactNotes] = useState(article?.englishImpactNotes ?? "");
  const [englishConclusion, setEnglishConclusion] = useState(article?.englishConclusion ?? "");
  const [englishDescription, setEnglishDescription] = useState(article?.englishDescription ?? "");
  const [englishSeoTitle, setEnglishSeoTitle] = useState(article?.englishSeoTitle ?? "");
  const [englishSeoDescription, setEnglishSeoDescription] = useState(
    article?.englishSeoDescription ?? article?.englishDescription ?? ""
  );
  const [englishKeywords, setEnglishKeywords] = useState(article?.englishKeywords ?? "");
  const [englishSeoKeywords, setEnglishSeoKeywords] = useState(article?.englishSeoKeywords ?? "");

  return (
    <>
      <AiNewsTranslationPanel
        onTranslated={(data) => {
          setEnglishTitle(data.englishTitle);
          setEnglishSubtitle(data.englishSubtitle);
          setEnglishSummary(data.englishSummary);
          setEnglishContent(data.englishContent);
          setEnglishKeyTakeaways(data.englishKeyTakeaways.join("\n"));
          setEnglishImpactNotes(data.englishImpactNotes);
          setEnglishConclusion(data.englishConclusion);
          setEnglishDescription(data.englishDescription);
          setEnglishSeoTitle(data.englishSeoTitle);
          setEnglishSeoDescription(data.englishSeoDescription);
          setEnglishKeywords(data.englishKeywords);
          setEnglishSeoKeywords(data.englishSeoKeywords);
        }}
      />

      <Field label="English title" className="md:col-span-2">
        <input name="englishTitle" value={englishTitle} onChange={(event) => setEnglishTitle(event.target.value)} className={inputClass} />
      </Field>
      <Field label="English subtitle" className="md:col-span-2">
        <input name="englishSubtitle" value={englishSubtitle} onChange={(event) => setEnglishSubtitle(event.target.value)} className={inputClass} />
      </Field>
      <Field label="English summary" className="md:col-span-2">
        <textarea name="englishSummary" value={englishSummary} onChange={(event) => setEnglishSummary(event.target.value)} className={textareaClass} />
      </Field>
      <Field label="English content" className="md:col-span-2">
        <textarea
          name="englishContent"
          value={englishContent}
          onChange={(event) => setEnglishContent(event.target.value)}
          className={`${textareaClass} min-h-[260px]`}
        />
      </Field>
      <Field label="English takeaways" className="md:col-span-2">
        <textarea
          name="englishKeyTakeaways"
          value={englishKeyTakeaways}
          onChange={(event) => setEnglishKeyTakeaways(event.target.value)}
          className={textareaClass}
        />
      </Field>
      <Field label="English impact notes" className="md:col-span-2">
        <textarea
          name="englishImpactNotes"
          value={englishImpactNotes}
          onChange={(event) => setEnglishImpactNotes(event.target.value)}
          className={textareaClass}
        />
      </Field>
      <Field label="English conclusion" className="md:col-span-2">
        <textarea
          name="englishConclusion"
          value={englishConclusion}
          onChange={(event) => setEnglishConclusion(event.target.value)}
          className={textareaClass}
        />
      </Field>
      <Field label="English SEO title">
        <input name="englishSeoTitle" value={englishSeoTitle} onChange={(event) => setEnglishSeoTitle(event.target.value)} className={inputClass} />
      </Field>
      <Field label="English keywords">
        <input name="englishKeywords" value={englishKeywords} onChange={(event) => setEnglishKeywords(event.target.value)} className={inputClass} />
      </Field>
      <Field label="English description" className="md:col-span-2">
        <textarea
          name="englishDescription"
          value={englishDescription}
          onChange={(event) => setEnglishDescription(event.target.value)}
          className={textareaClass}
        />
      </Field>
      <Field label="English SEO description" className="md:col-span-2">
        <textarea
          name="englishSeoDescription"
          value={englishSeoDescription}
          onChange={(event) => setEnglishSeoDescription(event.target.value)}
          className={textareaClass}
        />
      </Field>
      <input type="hidden" name="englishSeoKeywords" value={englishSeoKeywords} />
    </>
  );
}
