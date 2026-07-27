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

export type AiNewsOpportunityContentKind = "news" | "evergreen";

export type AiNewsOpportunitySourceAuthority =
  | "first-party"
  | "government"
  | "standards-body"
  | "primary-research";

export type AiNewsOpportunitySourceEvidence = {
  url: string;
  authority: AiNewsOpportunitySourceAuthority;
  supports: string;
};

export type AiNewsOpportunityQuerySource =
  | "google-search-console"
  | "bing-webmaster"
  | "baidu-resource-platform";

export type AiNewsOpportunityQueryEvidence = {
  source: AiNewsOpportunityQuerySource;
  query: string;
  observedAt: string;
  impressions: number;
  clicks?: number;
  targetPath?: string;
};

export type AiNewsOpportunityRecord = {
  id: string;
  contentKind: AiNewsOpportunityContentKind;
  eventKey: string;
  eventName: string;
  eventDate: string;
  eventSourceUrl: string;
  topic: string;
  userTask: string;
  sourceUrls: string[];
};

export type AiNewsOpportunityCandidate = AiNewsOpportunityRecord & {
  userImpact: string;
  sourceEvidence: AiNewsOpportunitySourceEvidence[];
  queryEvidence: AiNewsOpportunityQueryEvidence[];
  demandScore: number;
  bilingual: boolean;
};

export type AiNewsOpportunityDecisionReason =
  | "accepted"
  | "missing-query-evidence"
  | "missing-source-evidence"
  | "missing-event-key"
  | "missing-user-impact"
  | "missing-user-task"
  | "bilingual-contract-required"
  | "duplicate-news-event"
  | "insufficient-distinction";

export type AiNewsOpportunityDecisionStatus =
  | "evidence_missing"
  | "rejected"
  | "accepted";

export type AiNewsOpportunityDecision = {
  candidate: AiNewsOpportunityCandidate;
  eventFingerprint: string | null;
  status: AiNewsOpportunityDecisionStatus;
  reason: AiNewsOpportunityDecisionReason;
};

export const minKeywordLength = 2;
export const maxKeywordLength = 24;
export const minArticleCount = 2;
export const minSearchCount30d = 5;
export const minTotalHeat = 12;
export const minRenderableArticleCount = 3;
export const maxKeywordCloudItems = 12;
export const maxEnglishKeywordCloudItems = 8;
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

  const maxItems = input.locale === "en" ? maxEnglishKeywordCloudItems : maxKeywordCloudItems;
  return applyKeywordInterventions(scored, input.interventions).slice(0, maxItems);
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

export function buildAiNewsEventFingerprint(
  input: Pick<AiNewsOpportunityRecord, "eventKey" | "eventDate" | "eventSourceUrl">,
) {
  const eventDate = normalizeOpportunityDate(input.eventDate);
  const eventKey = normalizeOpportunityEventKey(input.eventKey);
  if (!eventKey) {
    throw new Error("Event key must contain a Unicode letter or number.");
  }
  const eventSourceUrl = canonicalizeOpportunitySource(input.eventSourceUrl);
  return [eventDate, eventKey, eventSourceUrl].join("|");
}

export function scanAiNewsOpportunities(input: {
  existing?: AiNewsOpportunityRecord[];
  candidates: AiNewsOpportunityCandidate[];
}) {
  const accepted: AiNewsOpportunityCandidate[] = [];
  const decisions: AiNewsOpportunityDecision[] = [];
  const knownByEvent = new Map<string, AiNewsOpportunityRecord[]>();

  for (const item of input.existing ?? []) {
    if (!normalizeOpportunityEventKey(item.eventKey)) continue;
    const fingerprint = buildAiNewsEventFingerprint(item);
    knownByEvent.set(fingerprint, [...(knownByEvent.get(fingerprint) ?? []), item]);
  }

  const candidates = input.candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort((left, right) => right.candidate.demandScore - left.candidate.demandScore || left.index - right.index);

  for (const { candidate } of candidates) {
    const normalizedEventKey = normalizeOpportunityEventKey(candidate.eventKey);
    if (!normalizedEventKey) {
      decisions.push({
        candidate,
        eventFingerprint: null,
        status: "evidence_missing",
        reason: "missing-event-key",
      });
      continue;
    }

    const eventFingerprint = buildAiNewsEventFingerprint(candidate);
    const sameEventItems = knownByEvent.get(eventFingerprint) ?? [];
    let reason: AiNewsOpportunityDecisionReason = "accepted";

    if (!hasValidQueryEvidence(candidate.queryEvidence)) {
      reason = "missing-query-evidence";
    } else if (!hasAuthoritativeSourceEvidence(candidate)) {
      reason = "missing-source-evidence";
    } else if (!isSpecificOpportunityText(candidate.userImpact, 12, 4)) {
      reason = "missing-user-impact";
    } else if (!isExecutableOpportunityTask(candidate.userTask)) {
      reason = "missing-user-task";
    } else if (!candidate.bilingual) {
      reason = "bilingual-contract-required";
    } else if (
      candidate.contentKind === "news" &&
      sameEventItems.some((item) => item.contentKind === "news")
    ) {
      reason = "duplicate-news-event";
    } else if (
      candidate.contentKind === "evergreen" &&
      sameEventItems.some((item) => !isMateriallyDistinctOpportunity(candidate, item))
    ) {
      reason = "insufficient-distinction";
    }

    decisions.push({
      candidate,
      eventFingerprint,
      status: getOpportunityDecisionStatus(reason),
      reason,
    });
    if (reason !== "accepted") continue;

    accepted.push(candidate);
    knownByEvent.set(eventFingerprint, [...sameEventItems, candidate]);
  }

  return { accepted, decisions };
}

function getOpportunityDecisionStatus(
  reason: AiNewsOpportunityDecisionReason,
): AiNewsOpportunityDecisionStatus {
  if (reason === "accepted") return "accepted";
  if (
    reason === "missing-query-evidence" ||
    reason === "missing-source-evidence" ||
    reason === "missing-event-key" ||
    reason === "missing-user-impact" ||
    reason === "missing-user-task"
  ) {
    return "evidence_missing";
  }
  return "rejected";
}

function hasAuthoritativeSourceEvidence(candidate: AiNewsOpportunityCandidate) {
  const eventSourceUrl = canonicalizeOpportunitySource(candidate.eventSourceUrl);
  if (!isSpecificHttpsSource(eventSourceUrl)) return false;

  const sourceUrls = new Set(
    (candidate.sourceUrls ?? []).map(canonicalizeOpportunitySource).filter(Boolean),
  );
  if (!sourceUrls.has(eventSourceUrl)) return false;

  const evidence = candidate.sourceEvidence ?? [];
  if (!evidence.length) return false;

  return (
    evidence.every(
      (item) =>
        isTrustedSourceEvidence(item) &&
        sourceUrls.has(canonicalizeOpportunitySource(item.url)) &&
        isSpecificOpportunityText(item.supports, 12, 3),
    ) &&
    evidence.some((item) => canonicalizeOpportunitySource(item.url) === eventSourceUrl)
  );
}

function hasValidQueryEvidence(value: unknown): value is AiNewsOpportunityQueryEvidence[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => {
      if (!item || typeof item !== "object") return false;
      const evidence = item as Record<string, unknown>;
      return (
        isAiNewsOpportunityQuerySource(evidence.source) &&
        typeof evidence.query === "string" &&
        evidence.query.trim().length > 0 &&
        typeof evidence.observedAt === "string" &&
        isAbsoluteObservationTime(evidence.observedAt) &&
        typeof evidence.impressions === "number" &&
        Number.isInteger(evidence.impressions) &&
        evidence.impressions > 0 &&
        (evidence.clicks === undefined ||
          (typeof evidence.clicks === "number" &&
            Number.isInteger(evidence.clicks) &&
            evidence.clicks >= 0)) &&
        (evidence.targetPath === undefined ||
          (typeof evidence.targetPath === "string" &&
            evidence.targetPath.trim().startsWith("/") &&
            !evidence.targetPath.trim().startsWith("//")))
      );
    })
  );
}

function isAiNewsOpportunityQuerySource(value: unknown): value is AiNewsOpportunityQuerySource {
  return (
    value === "google-search-console" ||
    value === "bing-webmaster" ||
    value === "baidu-resource-platform"
  );
}

function isAbsoluteObservationTime(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isTrustedSourceEvidence(value: unknown): value is AiNewsOpportunitySourceEvidence {
  if (!value || typeof value !== "object") return false;
  const evidence = value as Record<string, unknown>;
  if (
    typeof evidence.url !== "string" ||
    typeof evidence.authority !== "string" ||
    typeof evidence.supports !== "string" ||
    !isSpecificOpportunityText(evidence.supports, 12, 3)
  ) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(evidence.url);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" || url.pathname === "/") return false;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.toLowerCase();

  if (evidence.authority === "first-party") {
    return host === "github.blog" && path.startsWith("/changelog/");
  }
  if (evidence.authority === "government") {
    return (
      host === "gov.uk" ||
      host.endsWith(".gov.uk") ||
      host === "gov.cn" ||
      host.endsWith(".gov.cn") ||
      host.endsWith(".gov") ||
      host === "europa.eu" ||
      host.endsWith(".europa.eu")
    );
  }
  if (evidence.authority === "standards-body") {
    return (
      (host === "modelcontextprotocol.io" && path.startsWith("/specification/")) ||
      (host === "rfc-editor.org" && path.startsWith("/rfc/")) ||
      (host === "w3.org" && path.startsWith("/tr/")) ||
      (host === "iso.org" && path.startsWith("/standard/")) ||
      (host === "nist.gov" && path !== "/")
    );
  }
  if (evidence.authority === "primary-research") {
    return (
      (host === "arxiv.org" && (path.startsWith("/abs/") || path.startsWith("/pdf/"))) ||
      (host === "openreview.net" && path.startsWith("/forum")) ||
      (host === "pubmed.ncbi.nlm.nih.gov" && path !== "/") ||
      (host === "dl.acm.org" && path.startsWith("/doi/")) ||
      (host === "nature.com" && path.startsWith("/articles/")) ||
      (host === "science.org" && path.startsWith("/doi/"))
    );
  }
  return false;
}

function isSpecificHttpsSource(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && url.pathname !== "/";
  } catch {
    return false;
  }
}

function isExecutableOpportunityTask(value: string) {
  const normalized = normalizeOpportunityText(value);
  if (
    new Set([
      "read the news",
      "read news",
      "understand the announcement",
      "summarize the announcement",
      "read the announcement",
      "\u9605\u8bfb\u65b0\u95fb",
      "\u4e86\u89e3\u516c\u544a",
    ]).has(normalized)
  ) {
    return false;
  }
  return isSpecificOpportunityText(value, 8, 3);
}

function isSpecificOpportunityText(
  value: string | null | undefined,
  minimumCharacters: number,
  minimumTokens: number,
) {
  const normalized = normalizeOpportunityText(value ?? "");
  const compactLength = normalized.replace(/\s+/g, "").length;
  return (
    compactLength >= minimumCharacters &&
    tokenizeOpportunityText(normalized).length >= minimumTokens
  );
}

function isMateriallyDistinctOpportunity(candidate: AiNewsOpportunityRecord, existing: AiNewsOpportunityRecord) {
  const candidateTopic = normalizeOpportunityText(candidate.topic);
  const existingTopic = normalizeOpportunityText(existing.topic);
  const candidateTask = normalizeOpportunityText(candidate.userTask);
  const existingTask = normalizeOpportunityText(existing.userTask);

  if (!candidateTopic || !candidateTask) return false;
  if (candidateTopic === existingTopic || candidateTask === existingTask) return false;

  return textSimilarity(candidateTopic, existingTopic) < 0.7 && textSimilarity(candidateTask, existingTask) < 0.7;
}

function textSimilarity(left: string, right: string) {
  const leftTokens = new Set(tokenizeOpportunityText(left));
  const rightTokens = new Set(tokenizeOpportunityText(right));
  if (!leftTokens.size || !rightTokens.size) return left === right ? 1 : 0;

  const shared = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? shared / union : 0;
}

function tokenizeOpportunityText(value: string) {
  const wordTokens = value.match(/[a-z0-9]+|[\p{Script=Han}]/giu);
  return wordTokens ?? [];
}

function normalizeOpportunityText(value: string) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOpportunityDate(value: string) {
  const datePrefix = String(value ?? "").trim().match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return datePrefix ?? String(value ?? "").trim();
}

function normalizeOpportunityEventKey(value: string) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function canonicalizeOpportunitySource(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^(?:utm_.+|gclid|fbclid|msclkid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\?$/, "");
  } catch {
    return String(value ?? "").trim().replace(/[?#].*$/, "").replace(/\/+$/, "");
  }
}
