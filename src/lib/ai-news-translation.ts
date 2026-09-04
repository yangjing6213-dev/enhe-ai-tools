import { z } from "zod";

const translationInputSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  summary: z.string().min(1),
  content: z.string().min(1),
  keyTakeaways: z.array(z.string()).default([]),
  impactNotes: z.string().optional(),
  conclusion: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  keywords: z.string().optional()
});

const translationOutputSchema = z.object({
  englishTitle: z.string().min(1),
  englishSubtitle: z.string().optional().default(""),
  englishSummary: z.string().min(1),
  englishContent: z.string().min(1),
  englishKeyTakeaways: z.array(z.string()).default([]),
  englishImpactNotes: z.string().optional().default(""),
  englishConclusion: z.string().optional().default(""),
  englishDescription: z.string().optional().default(""),
  englishSeoTitle: z.string().optional().default(""),
  englishSeoDescription: z.string().optional().default(""),
  englishKeywords: z.string().optional().default(""),
  englishSeoKeywords: z.string().optional().default("")
});

export type AiNewsTranslationInput = z.input<typeof translationInputSchema>;
export type AiNewsTranslationDraft = z.output<typeof translationOutputSchema>;

function getTranslationConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  if (!baseUrl) throw new Error("OPENAI_BASE_URL is not configured");
  if (!model) throw new Error("OPENAI_MODEL is not configured");

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    model
  };
}

function buildTranslationPrompt(input: z.output<typeof translationInputSchema>) {
  return [
    "Translate this Chinese AI news draft into concise, publication-ready English.",
    "Keep factual meaning and preserve Markdown heading structure for content.",
    "Return JSON only with these keys:",
    "englishTitle, englishSubtitle, englishSummary, englishContent, englishKeyTakeaways, englishImpactNotes, englishConclusion, englishDescription, englishSeoTitle, englishSeoDescription, englishKeywords, englishSeoKeywords.",
    JSON.stringify(input)
  ].join("\n");
}

export async function generateAiNewsEnglishDraft(input: AiNewsTranslationInput): Promise<AiNewsTranslationDraft> {
  const payload = translationInputSchema.parse(input);
  const { apiKey, baseUrl, model } = getTranslationConfig();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an editor translating Chinese AI news into clean English. Preserve meaning, keep Markdown structure, and return JSON only."
        },
        {
          role: "user",
          content: buildTranslationPrompt(payload)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`translation request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("translation response missing content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("translation response is not valid JSON");
  }

  return translationOutputSchema.parse(parsed);
}
