import { z } from "zod";

const optionalTrimmedString = (max: number) => z.string().trim().min(1).max(max).optional();
const optionalHttpUrl = z.string().trim().url().max(2_000).refine((value) => /^https?:\/\//i.test(value), "URL must use http or https").optional();
const publishedAtSchema = z
  .union([z.string().trim().datetime().transform((value) => new Date(value)), z.date()])
  .optional();

export const aiNewsSourceSchema = z.object({
  title: z.string().trim().min(1).max(220),
  url: z.string().trim().url().max(2_000).refine((value) => /^https?:\/\//i.test(value), "Source URL must use http or https"),
  sourceType: z.string().trim().min(1).max(80),
  description: optionalTrimmedString(500)
});

export const aiNewsImportArticleSchema = z.object({
  title: z.string().trim().min(1).max(180),
  slug: optionalTrimmedString(220),
  subtitle: optionalTrimmedString(220),
  description: optionalTrimmedString(500),
  keywords: optionalTrimmedString(500),
  summary: z.string().trim().min(1).max(1_200),
  content: z.string().trim().min(1).max(50_000),
  coverImage: optionalHttpUrl,
  videoUrl: optionalHttpUrl,
  videoTitle: optionalTrimmedString(220),
  videoDescription: optionalTrimmedString(500),
  author: optionalTrimmedString(120),
  categoryName: optionalTrimmedString(120),
  categorySlug: optionalTrimmedString(220),
  tags: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  readingTime: z.number().int().positive().max(120).optional(),
  seoTitle: optionalTrimmedString(220),
  seoDescription: optionalTrimmedString(500),
  seoKeywords: optionalTrimmedString(500),
  canonicalUrl: optionalHttpUrl,
  keyTakeaways: z.array(z.string().trim().min(1).max(220)).max(8).default([]),
  impactNotes: optionalTrimmedString(2_000),
  conclusion: optionalTrimmedString(2_000),
  relatedArticleIds: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  relatedToolIds: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  relatedTutorialIds: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  englishTitle: optionalTrimmedString(180),
  englishSubtitle: optionalTrimmedString(220),
  englishDescription: optionalTrimmedString(500),
  englishSummary: optionalTrimmedString(1_200),
  englishContent: optionalTrimmedString(50_000),
  englishKeywords: optionalTrimmedString(500),
  englishSeoTitle: optionalTrimmedString(220),
  englishSeoDescription: optionalTrimmedString(500),
  englishSeoKeywords: optionalTrimmedString(500),
  englishKeyTakeaways: z.array(z.string().trim().min(1).max(220)).max(8).default([]),
  englishImpactNotes: optionalTrimmedString(2_000),
  englishConclusion: optionalTrimmedString(2_000),
  externalSources: z.array(aiNewsSourceSchema).min(1).max(12)
});

export const aiNewsImportPayloadSchema = z.object({
  publishMode: z.enum(["draft", "published"]).default("draft"),
  publishedAt: publishedAtSchema,
  importBatchId: optionalTrimmedString(120),
  article: aiNewsImportArticleSchema
});

export type AiNewsImportPayload = z.infer<typeof aiNewsImportPayloadSchema>;
export type AiNewsImportArticle = z.infer<typeof aiNewsImportArticleSchema>;
