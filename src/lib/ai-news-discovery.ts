import type { Locale } from "@/lib/dictionaries";

export type AiNewsKeywordCandidate = {
  keyword: string;
  articleCount: number;
  searchCount30d: number;
  totalHeat: number;
  freshnessDays: number;
  tagHits: number;
  keywordFieldHits: number;
};

export type AiNewsKeywordInterventionRule = {
  keyword: string;
  locale: Locale;
  isPinned: boolean;
  isHidden: boolean;
  displayName: string | null;
  weightBoost: number;
};

export type AiNewsKeywordCloudItem = AiNewsKeywordCandidate & {
  displayName: string;
  score: number;
  isPinned: boolean;
  query: string;
};

export type AiNewsTopicCollectionItem = {
  key: string;
  title: string;
  query: string;
  score: number;
  articleCount: number;
  searchCount30d: number;
  totalHeat: number;
};

export type AiNewsExternalSeoBoost = {
  keyword: string;
  weightBoost?: number;
  externalSearchVolume?: number;
  externalTrendScore?: number;
  externalCompetitionScore?: number;
};

export type AiNewsExternalSeoProvider = {
  getKeywordBoosts(input: { locale: Locale; keywords: string[] }): Promise<AiNewsExternalSeoBoost[]>;
};

export const minKeywordLength = 2;
export const maxKeywordLength = 24;
export const minArticleCount = 2;
export const minSearchCount30d = 5;
export const minTotalHeat = 12;
export const minRenderableArticleCount = 3;
export const maxKeywordCloudItems = 12;
export const topicCollectionCount = 5;

const defaultTopicSeeds: Record<Locale, string[]> = {
  zh: ["AI资讯", "ENHE AI", "趋势解读", "工具落地", "AI教程"],
  en: ["AI News", "ENHE AI", "Trend Insights", "Tool Workflows", "AI Tutorials"]
};

const genericStopWords = new Set([
  "ai",
  "AI",
  "工具",
  "教程",
  "软件",
  "课程",
  "账号服务",
  "news",
  "tool",
  "tools",
  "tutorial",
  "tutorials",
  "guide",
  "guides"
]);

const punctuationOnlyPattern = /^[\d\p{P}\p{S}\s]+$/u;

export const defaultAiNewsExternalSeoProvider: AiNewsExternalSeoProvider = {
  async getKeywordBoosts() {
    return [];
  }
};

export function normalizeAiNewsKeyword(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .replace(/[\u3000\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,，、;；:：\-|/()[\]{}<>"'`~!@#$%^&*_+=?.]+/u, "")
    .replace(/[\s,，、;；:：\-|/()[\]{}<>"'`~!@#$%^&*_+=?.]+$/u, "")
    .trim();

  if (!normalized) return null;
  if (normalized.length < minKeywordLength || normalized.length > maxKeywordLength) return null;
  if (punctuationOnlyPattern.test(normalized)) return null;
  if (genericStopWords.has(normalized)) return null;
  return normalized;
}

export function passesAiNewsKeywordSeoRules(input: {
  keyword: string;
  articleCount: number;
  searchCount30d: number;
  totalHeat: number;
}) {
  const normalized = normalizeAiNewsKeyword(input.keyword);
  if (!normalized) return false;
  if (genericStopWords.has(normalized)) return false;
  if (input.articleCount < minRenderableArticleCount) return false;

  return input.articleCount >= minArticleCount || input.searchCount30d >= minSearchCount30d || input.totalHeat >= minTotalHeat;
}

function computeKeywordScore(item: AiNewsKeywordCandidate, weightBoost = 0, externalBoost = 0) {
  const freshnessBonus = Math.max(0, 14 - item.freshnessDays);
  return item.tagHits * 4 + item.keywordFieldHits * 3 + item.searchCount30d * 5 + item.totalHeat + freshnessBonus + weightBoost + externalBoost;
}

export function applyKeywordInterventions<
  T extends {
    keyword: string;
    score: number;
    displayName: string;
    articleCount: number;
    searchCount30d: number;
    totalHeat: number;
    isPinned?: boolean;
    freshnessDays?: number;
    tagHits?: number;
    keywordFieldHits?: number;
  }
>(items: T[], interventions: AiNewsKeywordInterventionRule[]) {
  const mapped = new Map(interventions.map((rule) => [rule.keyword, rule]));

  return items
    .map((item) => {
      const intervention = mapped.get(item.keyword);
      if (intervention?.isHidden) return null;

      const nextScore = item.score + (intervention?.weightBoost ?? 0);
      return {
        ...item,
        displayName: intervention?.displayName?.trim() || item.displayName,
        score: nextScore,
        isPinned: intervention?.isPinned ?? item.isPinned ?? false
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => {
      if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
      if (right.score !== left.score) return right.score - left.score;
      return right.articleCount - left.articleCount;
    });
}

export async function buildAiNewsKeywordCloud(input: {
  locale: Locale;
  candidates: AiNewsKeywordCandidate[];
  interventions: AiNewsKeywordInterventionRule[];
  externalProvider?: AiNewsExternalSeoProvider;
}) {
  const aggregated = new Map<string, AiNewsKeywordCandidate>();

  for (const candidate of input.candidates) {
    const normalized = normalizeAiNewsKeyword(candidate.keyword);
    if (!normalized) continue;

    const current = aggregated.get(normalized);
    if (!current) {
      aggregated.set(normalized, {
        ...candidate,
        keyword: normalized
      });
      continue;
    }

    aggregated.set(normalized, {
      keyword: normalized,
      articleCount: Math.max(current.articleCount, candidate.articleCount),
      searchCount30d: current.searchCount30d + candidate.searchCount30d,
      totalHeat: current.totalHeat + candidate.totalHeat,
      freshnessDays: Math.min(current.freshnessDays, candidate.freshnessDays),
      tagHits: current.tagHits + candidate.tagHits,
      keywordFieldHits: current.keywordFieldHits + candidate.keywordFieldHits
    });
  }

  const admitted = Array.from(aggregated.values()).filter((candidate) =>
    passesAiNewsKeywordSeoRules({
      keyword: candidate.keyword,
      articleCount: candidate.articleCount,
      searchCount30d: candidate.searchCount30d,
      totalHeat: candidate.totalHeat
    })
  );

  const provider = input.externalProvider ?? defaultAiNewsExternalSeoProvider;
  const boosts = await provider.getKeywordBoosts({
    locale: input.locale,
    keywords: admitted.map((candidate) => candidate.keyword)
  });
  const boostMap = new Map(
    boosts.map((boost) => [
      boost.keyword,
      (boost.weightBoost ?? 0) + (boost.externalSearchVolume ?? 0) / 100 + (boost.externalTrendScore ?? 0) - (boost.externalCompetitionScore ?? 0)
    ])
  );

  const scored = admitted.map((candidate) => ({
    ...candidate,
    displayName: candidate.keyword,
    score: computeKeywordScore(candidate, 0, boostMap.get(candidate.keyword) ?? 0),
    isPinned: false,
    query: candidate.keyword
  }));

  return applyKeywordInterventions(scored, input.interventions).slice(0, maxKeywordCloudItems);
}

export function buildAiNewsTopicCollections(input: {
  locale: Locale;
  keywordItems: Array<{
    keyword: string;
    displayName: string;
    score: number;
    articleCount: number;
    searchCount30d: number;
    totalHeat: number;
    isPinned: boolean;
  }>;
  fallbackTags: Array<{
    keyword: string;
    displayName: string;
    score: number;
    articleCount: number;
    searchCount30d: number;
    totalHeat: number;
    isPinned: boolean;
  }>;
}) {
  const topicMap = new Map<string, AiNewsTopicCollectionItem>();
  const candidates = [...input.keywordItems, ...input.fallbackTags];

  for (const candidate of candidates) {
    const normalized = normalizeAiNewsKeyword(candidate.keyword);
    if (!normalized || topicMap.has(normalized)) continue;

    topicMap.set(normalized, {
      key: normalized,
      title: input.locale === "zh" ? `${candidate.displayName}` : candidate.displayName,
      query: candidate.keyword,
      score: candidate.score,
      articleCount: candidate.articleCount,
      searchCount30d: candidate.searchCount30d,
      totalHeat: candidate.totalHeat
    });
  }

  for (const seed of defaultTopicSeeds[input.locale]) {
    const normalized = normalizeAiNewsKeyword(seed);
    if (!normalized || topicMap.has(normalized)) continue;

    topicMap.set(normalized, {
      key: normalized,
      title: seed,
      query: seed,
      score: 0,
      articleCount: 0,
      searchCount30d: 0,
      totalHeat: 0
    });
  }

  return Array.from(topicMap.values()).slice(0, topicCollectionCount);
}
