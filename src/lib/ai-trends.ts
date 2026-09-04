import { unstable_cache } from "next/cache";
import type { AiTrendBriefingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type AiTrendSourceSignal = {
  title: string;
  url: string;
  sourceType: string;
  observedSignal: string;
  observedAt?: string;
  credibilityNote?: string;
};

export type AiTrendDemandScenario = {
  name: string;
  heat: number;
  urgency: string;
  typicalUsers: string[];
  painPoint: string;
  representativeScenarios: string[];
  aiValue: string;
  productOpportunity: string;
  developmentPriority: string;
  evidenceSignals: string[];
};

export type AiTrendDemandBreakdown = {
  direction: string;
  heat: number;
  summary: string;
  scenarios: AiTrendDemandScenario[];
};

export type AiTrendSourcePayload = {
  sources: AiTrendSourceSignal[];
  demandBreakdowns: AiTrendDemandBreakdown[];
};

export type AiTrendBriefingPublishInput = {
  date: string;
  title: string;
  summary: string;
  coreConclusion: string;
  publicHighlights?: string[];
  fullHtml: string;
  sourceSignals?: unknown;
  demandBreakdowns?: unknown;
  status?: AiTrendBriefingStatus;
  isIncludedInTopicPage?: boolean;
  publishedAt?: string | Date | null;
};

export type AiTrendBriefingPublishData = {
  date: Date;
  slug: string;
  title: string;
  summary: string;
  coreConclusion: string;
  publicHighlights: string[];
  fullHtml: string;
  sourceSignals: AiTrendSourceSignal[];
  demandBreakdowns: AiTrendDemandBreakdown[];
  sourcePayload: AiTrendSourcePayload;
  status: AiTrendBriefingStatus;
  isIncludedInTopicPage: boolean;
  publishedAt: Date | null;
};

export type AiTrendBriefingRecord = {
  id: string;
  date: Date;
  slug: string;
  title: string;
  summary: string;
  coreConclusion: string;
  publicHighlights: string[];
  fullHtml: string;
  sourceSignals: unknown;
  status: AiTrendBriefingStatus;
  publishedAt: Date | null;
  isIncludedInTopicPage: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AiTrendBriefingView = Omit<AiTrendBriefingRecord, "sourceSignals" | "fullHtml"> & {
  sourceSignals: AiTrendSourceSignal[];
  sourceCount: number;
  signalTypes: string[];
  demandBreakdowns: AiTrendDemandBreakdown[];
  fullHtml?: string;
};

export const aiTrendBriefingCacheSeconds = 300;

function normalizeText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(100, Math.max(0, Math.round(number)));
}

function normalizeTextList(value: unknown, limit = 8) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeText).filter(Boolean).slice(0, limit);
}

function stripUtf8Bom(value: string) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isRecoverableAiTrendReadError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const candidate = error as Error & { code?: unknown; meta?: { table?: unknown } };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const message = error.message;

  return (
    code === "P1001" ||
    code === "P2021" ||
    /Can't reach database server/i.test(message) ||
    /ECONNREFUSED/i.test(message) ||
    (typeof candidate.meta?.table === "string" && candidate.meta.table.includes("ai_trend_briefings"))
  );
}

export function isValidAiTrendDateSlug(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function aiTrendDateSlugToDate(value: string) {
  if (!isValidAiTrendDateSlug(value)) {
    throw new Error(`Invalid AI trend briefing date slug: ${value}`);
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function dateToAiTrendSlug(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function buildAiTrendLoginUrl(dateSlug: string, locale: "zh" | "en" = "zh") {
  const nextPath = locale === "en" ? `/en/ai-trends/daily/${dateSlug}` : `/ai-trends/daily/${dateSlug}`;
  const loginPath = locale === "en" ? "/en/login" : "/login";
  return `${loginPath}?next=${encodeURIComponent(nextPath)}`;
}

function hasCjk(value: string | null | undefined) {
  return /[\u3400-\u9fff]/.test(String(value ?? ""));
}

function normalizeEnglishSentence(value: string) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized;
}

function buildEnglishTrendFallbackTitle(slug: string) {
  return `AI Demand Briefing - ${slug}`;
}

function buildEnglishTrendFallbackSummary(slug: string) {
  return `Daily AI demand summary for ${slug}, highlighting practical workflow demand, adoption signals, and the next actions worth tracking.`;
}

function buildEnglishTrendFallbackConclusion(slug: string) {
  return `This ${slug} briefing focuses on repeatable AI workflows, measurable efficiency gains, and product opportunities shaped by real-world demand signals.`;
}

function buildEnglishTrendFallbackHighlights(slug: string) {
  return [
    `Workflow demand remained the clearest signal in the ${slug} briefing.`,
    "Users continue to value AI that saves time, reduces repetition, and improves delivery quality.",
    "Lower-risk, high-frequency use cases remain the strongest opportunity area."
  ];
}

function localizeAiTrendSourceSignal(signal: AiTrendSourceSignal): AiTrendSourceSignal {
  return {
    ...signal,
    observedSignal: hasCjk(signal.observedSignal)
      ? "Public source signal captured from trend, product, or community activity."
      : normalizeEnglishSentence(signal.observedSignal),
    credibilityNote: hasCjk(signal.credibilityNote)
      ? "Source note available in the original published briefing."
      : signal.credibilityNote
  };
}

function buildLocalizedAiTrendHtml(view: AiTrendBriefingView) {
  return `<article><h1>${buildEnglishTrendFallbackTitle(view.slug)}</h1><p>${buildEnglishTrendFallbackConclusion(
    view.slug
  )}</p></article>`;
}

export function sanitizeAiTrendBriefingHtml(value: string) {
  const html = stripUtf8Bom(String(value ?? "")).trim();
  if (!html) {
    throw new Error("AI trend briefing fullHtml is required.");
  }

  if (/<\s*script\b/i.test(html) || /<\/\s*script\s*>/i.test(html)) {
    throw new Error("AI trend briefing HTML cannot contain script tags.");
  }

  if (/\son[a-z]+\s*=/i.test(html)) {
    throw new Error("AI trend briefing HTML cannot contain inline event handlers.");
  }

  if (/(?:href|src)\s*=\s*["']?\s*javascript:/i.test(html)) {
    throw new Error("AI trend briefing HTML cannot contain javascript URLs.");
  }

  return html;
}

function extractAiTrendSources(value: unknown): AiTrendSourceSignal[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const row = value as Record<string, unknown>;
  return normalizeAiTrendSourceSignals(row.sources);
}

export function normalizeAiTrendSourceSignals(value: unknown): AiTrendSourceSignal[] {
  if (!Array.isArray(value)) return extractAiTrendSources(value);

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = normalizeText(row.title);
      const url = normalizeText(row.url);
      const sourceType = normalizeText(row.sourceType);
      const observedSignal = normalizeText(row.observedSignal);
      const observedAt = normalizeText(row.observedAt);
      const credibilityNote = normalizeText(row.credibilityNote);

      if (!title || !url || !sourceType || !observedSignal || !isHttpUrl(url)) return null;

      return {
        title,
        url,
        sourceType,
        observedSignal,
        ...(observedAt ? { observedAt } : {}),
        ...(credibilityNote ? { credibilityNote } : {})
      } satisfies AiTrendSourceSignal;
    })
    .filter((item): item is AiTrendSourceSignal => Boolean(item));
}


function extractAiTrendDemandBreakdowns(value: unknown): AiTrendDemandBreakdown[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const row = value as Record<string, unknown>;
  return normalizeAiTrendDemandBreakdowns(row.demandBreakdowns);
}

export function normalizeAiTrendDemandBreakdowns(value: unknown): AiTrendDemandBreakdown[] {
  if (!Array.isArray(value)) return extractAiTrendDemandBreakdowns(value);

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const direction = normalizeText(row.direction);
      const summary = normalizeText(row.summary);
      const scenarios = Array.isArray(row.scenarios)
        ? row.scenarios
            .map((scenario) => {
              if (!scenario || typeof scenario !== "object") return null;
              const scenarioRow = scenario as Record<string, unknown>;
              const name = normalizeText(scenarioRow.name);
              const painPoint = normalizeText(scenarioRow.painPoint);
              const aiValue = normalizeText(scenarioRow.aiValue);
              const productOpportunity = normalizeText(scenarioRow.productOpportunity);

              if (!name || !painPoint || !aiValue || !productOpportunity) return null;

              return {
                name,
                heat: normalizeNumber(scenarioRow.heat),
                urgency: normalizeText(scenarioRow.urgency),
                typicalUsers: normalizeTextList(scenarioRow.typicalUsers, 6),
                painPoint,
                representativeScenarios: normalizeTextList(scenarioRow.representativeScenarios, 8),
                aiValue,
                productOpportunity,
                developmentPriority: normalizeText(scenarioRow.developmentPriority),
                evidenceSignals: normalizeTextList(scenarioRow.evidenceSignals, 8)
              } satisfies AiTrendDemandScenario;
            })
            .filter((scenario): scenario is AiTrendDemandScenario => Boolean(scenario))
            .sort((left, right) => right.heat - left.heat)
            .slice(0, 12)
        : [];

      if (!direction || !scenarios.length) return null;

      return {
        direction,
        heat: normalizeNumber(row.heat),
        summary,
        scenarios
      } satisfies AiTrendDemandBreakdown;
    })
    .filter((item): item is AiTrendDemandBreakdown => Boolean(item))
    .sort((left, right) => right.heat - left.heat)
    .slice(0, 12);
}

export function buildAiTrendSourcePayload(
  sourceSignals: AiTrendSourceSignal[],
  demandBreakdowns: AiTrendDemandBreakdown[]
): AiTrendSourcePayload {
  return {
    sources: sourceSignals,
    demandBreakdowns
  };
}
export function validateAiTrendBriefingInput(input: AiTrendBriefingPublishInput): AiTrendBriefingPublishData {
  const slug = normalizeText(input.date);
  const title = normalizeText(input.title);
  const summary = normalizeText(input.summary);
  const coreConclusion = normalizeText(input.coreConclusion);
  const status = input.status ?? "draft";
  const sourceSignals = normalizeAiTrendSourceSignals(input.sourceSignals);
  const demandBreakdowns = normalizeAiTrendDemandBreakdowns(input.demandBreakdowns ?? input.sourceSignals);
  const sourcePayload = buildAiTrendSourcePayload(sourceSignals, demandBreakdowns);
  const fullHtml = sanitizeAiTrendBriefingHtml(input.fullHtml);

  if (!isValidAiTrendDateSlug(slug)) {
    throw new Error("AI trend briefing date must be a valid YYYY-MM-DD slug.");
  }

  if (!title) {
    throw new Error("AI trend briefing title is required.");
  }

  if (!summary) {
    throw new Error("AI trend briefing summary is required.");
  }

  if (!coreConclusion) {
    throw new Error("AI trend briefing core conclusion is required.");
  }

  if (status === "published" && !sourceSignals.length) {
    throw new Error("Published AI trend briefing requires at least one source signal.");
  }

  const publishedAt =
    input.publishedAt === null
      ? null
      : input.publishedAt
        ? new Date(input.publishedAt)
        : status === "published"
          ? new Date()
          : null;

  if (publishedAt && Number.isNaN(publishedAt.getTime())) {
    throw new Error("AI trend briefing publishedAt must be a valid date.");
  }

  return {
    date: aiTrendDateSlugToDate(slug),
    slug,
    title,
    summary,
    coreConclusion,
    publicHighlights: (input.publicHighlights ?? []).map(normalizeText).filter(Boolean).slice(0, 8),
    fullHtml,
    sourceSignals,
    demandBreakdowns,
    sourcePayload,
    status,
    isIncludedInTopicPage: Boolean(input.isIncludedInTopicPage),
    publishedAt
  };
}

export function toAiTrendBriefingView(
  briefing: AiTrendBriefingRecord,
  includeFullHtml: boolean
): AiTrendBriefingView {
  const sourceSignals = normalizeAiTrendSourceSignals(briefing.sourceSignals);
  const demandBreakdowns = normalizeAiTrendDemandBreakdowns(briefing.sourceSignals);
  const signalTypes = Array.from(new Set(sourceSignals.map((source) => source.sourceType)));

  return {
    id: briefing.id,
    date: briefing.date,
    slug: briefing.slug,
    title: briefing.title,
    summary: briefing.summary,
    coreConclusion: briefing.coreConclusion,
    publicHighlights: briefing.publicHighlights,
    status: briefing.status,
    publishedAt: briefing.publishedAt,
    isIncludedInTopicPage: briefing.isIncludedInTopicPage,
    createdAt: briefing.createdAt,
    updatedAt: briefing.updatedAt,
    sourceSignals,
    sourceCount: sourceSignals.length,
    signalTypes,
    demandBreakdowns,
    ...(includeFullHtml ? { fullHtml: briefing.fullHtml } : {})
  };
}

export function localizeAiTrendBriefingView(view: AiTrendBriefingView, locale: "zh" | "en") {
  if (locale === "zh") return view;

  return {
    ...view,
    title: hasCjk(view.title) ? buildEnglishTrendFallbackTitle(view.slug) : normalizeEnglishSentence(view.title),
    summary: hasCjk(view.summary) ? buildEnglishTrendFallbackSummary(view.slug) : normalizeEnglishSentence(view.summary),
    coreConclusion: hasCjk(view.coreConclusion)
      ? buildEnglishTrendFallbackConclusion(view.slug)
      : normalizeEnglishSentence(view.coreConclusion),
    publicHighlights: view.publicHighlights.length
      ? view.publicHighlights.map((item, index) =>
          hasCjk(item) ? buildEnglishTrendFallbackHighlights(view.slug)[index] ?? "Practical demand signal captured in this briefing." : normalizeEnglishSentence(item)
        )
      : buildEnglishTrendFallbackHighlights(view.slug),
    sourceSignals: view.sourceSignals.map(localizeAiTrendSourceSignal),
    ...(view.fullHtml ? { fullHtml: hasCjk(view.fullHtml) ? buildLocalizedAiTrendHtml(view) : view.fullHtml } : {})
  };
}

const publishedWhere = {
  status: "published" as const,
  publishedAt: { not: null }
} satisfies Prisma.AiTrendBriefingWhereInput;

const aiTrendSummarySelect = {
  id: true,
  date: true,
  slug: true,
  title: true,
  summary: true,
  coreConclusion: true,
  publicHighlights: true,
  fullHtml: true,
  sourceSignals: true,
  status: true,
  publishedAt: true,
  isIncludedInTopicPage: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.AiTrendBriefingSelect;

const getCachedAiTrendBriefingSummaries = unstable_cache(
  async (limit: number) => {
    try {
      const rows = await prisma.aiTrendBriefing.findMany({
        where: publishedWhere,
        select: aiTrendSummarySelect,
        orderBy: [{ publishedAt: "desc" }, { date: "desc" }],
        take: limit
      });

      return rows.map((row) => toAiTrendBriefingView(row, false));
    } catch (error) {
      if (isRecoverableAiTrendReadError(error)) return [];
      throw error;
    }
  },
  ["public-ai-trend-briefing-summaries"],
  { revalidate: aiTrendBriefingCacheSeconds, tags: ["public-ai-trends"] }
);

const getCachedAiTrendBriefingByDateSlug = unstable_cache(
  async (slug: string) => {
    try {
      return await prisma.aiTrendBriefing.findFirst({
        where: { ...publishedWhere, slug },
        select: aiTrendSummarySelect
      });
    } catch (error) {
      if (isRecoverableAiTrendReadError(error)) return null;
      throw error;
    }
  },
  ["public-ai-trend-briefing-by-date"],
  { revalidate: aiTrendBriefingCacheSeconds, tags: ["public-ai-trends"] }
);

export async function getAiTrendBriefingSummaries(limit = 12) {
  return getCachedAiTrendBriefingSummaries(Math.min(Math.max(1, limit), 60));
}

export async function getAiTrendBriefingByDateSlug(slug: string) {
  if (!isValidAiTrendDateSlug(slug)) return null;
  return getCachedAiTrendBriefingByDateSlug(slug);
}
