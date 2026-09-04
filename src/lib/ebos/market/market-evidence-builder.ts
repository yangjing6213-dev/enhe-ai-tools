import { readFile } from "node:fs/promises";
import { getWeeklyWindow } from "../date-window";
import {
  readEvidenceCatalog,
  type EbosEvidenceCatalogEntry,
  type EbosEvidenceWarning
} from "../evidence";
import type { EbosConfidenceLevel } from "../types";
import {
  loadMarketManualInput,
  normalizeManualMarketSignals,
  parseMarketRssSources
} from "./market-input";
import { normalizeMarketSignal } from "./market-signal-normalizer";
import {
  rankMarketOpportunities,
  scoreMarketOpportunities
} from "./market-opportunity-scorer";
import type {
  BuildMarketEvidenceOptions,
  EbosMarketDataSourceSummary,
  EbosMarketEvidence,
  EbosMarketOpportunityScore,
  EbosMarketSignal,
  EbosMarketTopic,
  MarketOpportunityScoringOptions
} from "./market-evidence-types";

const DEFAULT_CATALOG_PATH = "reports/ebos/evidence/catalog/latest-evidence-catalog.json";

export async function buildMarketEvidence(
  options: BuildMarketEvidenceOptions = {}
): Promise<EbosMarketEvidence> {
  const generatedAt = toIsoString(options.generatedAt ?? new Date());
  const targetDate = toDateKey(options.targetDate ?? generatedAt);
  const period = resolvePeriod(options, targetDate);
  const warnings: EbosEvidenceWarning[] = [];
  const manual = await loadMarketManualInput({
    input: options.manualInput,
    filePath: options.manualInputPath
  });
  warnings.push(...manual.warnings);
  const manualSignals = normalizeManualMarketSignals(manual.input);
  warnings.push(...manualSignals.warnings);
  const rssResult = options.includeNetworkSources
    ? await readRssSignals(options, warnings)
    : { signals: [] as EbosMarketSignal[], configuredSources: [] as string[], unavailableSources: [] as string[] };
  const signals = dedupeSignals([...manualSignals.signals, ...rssResult.signals]);
  const evidenceContext = await readEvidenceContext(options.catalogPath ?? DEFAULT_CATALOG_PATH, warnings);
  const scoringOptions: MarketOpportunityScoringOptions = {
    firstRevenueAchieved: evidenceContext.firstRevenueAchieved,
    preferLowCostValidation: evidenceContext.firstRevenueAchieved === false,
    boostTopics: evidenceContext.boostTopics,
    seoEvidenceStrong: evidenceContext.seoEvidenceStrong,
    geoEvidenceStrong: evidenceContext.geoEvidenceStrong
  };
  const opportunityScores = rankMarketOpportunities(scoreMarketOpportunities(signals, scoringOptions));
  const recommendedProductDirections = opportunityScores
    .filter((opportunity) => opportunity.recommendedAction !== "ignore")
    .slice(0, 5);

  if (signals.length === 0) {
    warnings.push(warning(
      "missing_market_signals",
      "No market signals were available; market evidence is a data gap.",
      "market_research"
    ));
  }

  const dataSourceSummary = buildDataSourceSummary(signals, warnings, rssResult.configuredSources, rssResult.unavailableSources);
  const confidence = calculateMarketConfidence(signals, dataSourceSummary, warnings);
  const overallScore = calculateOverallScore(opportunityScores, confidence);

  return {
    evidenceType: "market_evidence",
    targetDate,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    generatedAt,
    overallScore,
    confidence,
    marketSummary: buildMarketSummary(signals),
    signalSummary: buildSignalSummary(signals),
    opportunitySummary: buildOpportunitySummary(opportunityScores),
    recommendedProductDirections,
    risks: buildRisks(signals, recommendedProductDirections, dataSourceSummary),
    opportunities: buildOpportunities(recommendedProductDirections),
    actionItems: buildActionItems(recommendedProductDirections),
    warnings,
    signals,
    opportunityScores,
    dataSourceSummary,
    manualInputSummary: {
      observationTopics: manual.input.observationTopics,
      notes: manual.input.notes ?? []
    }
  };
}

async function readRssSignals(
  options: BuildMarketEvidenceOptions,
  warnings: EbosEvidenceWarning[]
) {
  const configuredSources = parseMarketRssSources(options.env ?? process.env);
  const fetcher = options.fetcher ?? globalThis.fetch;
  const signals: EbosMarketSignal[] = [];
  const unavailableSources: string[] = [];

  if (!fetcher) {
    warnings.push(warning("rss_fetch_unavailable", "Global fetch is unavailable; RSS market sources were skipped.", "market_research"));
    return { signals, configuredSources: configuredSources.map((source) => source.label), unavailableSources };
  }

  for (const source of configuredSources) {
    try {
      const response = await fetcher(source.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xml = await response.text();
      signals.push(...parseRssItems(xml).map((item) => normalizeMarketSignal({
        source: source.label,
        sourceType: "rss",
        title: item.title,
        description: item.description,
        url: item.url,
        publishedAt: item.publishedAt,
        tags: [source.label]
      })));
    } catch (error) {
      unavailableSources.push(source.label);
      warnings.push(warning(
        "rss_source_unavailable",
        `Public RSS source ${source.label} could not be read; continuing without it. ${errorMessage(error)}`,
        "market_research"
      ));
    }
  }

  return {
    signals,
    configuredSources: configuredSources.map((source) => source.label),
    unavailableSources
  };
}

async function readEvidenceContext(
  catalogPath: string,
  warnings: EbosEvidenceWarning[]
): Promise<MarketOpportunityScoringOptions> {
  const catalog = await readEvidenceCatalog({ catalogPath });
  if (!catalog) return {};
  const latest = catalog.summary.latestByKind;
  const productPayload = await readPayload(latest.product_evidence);
  const revenuePayload = await readPayload(latest.revenue_evidence);
  const boostTopics = detectBoostTopicsFromProductEvidence(productPayload);
  const firstRevenueAchieved = readBooleanPath(revenuePayload, ["revenueSummary", "firstRevenueAchieved"])
    ?? (latest.revenue_evidence?.payloadSummary?.firstRevenueAchieved === true);

  if (latest.product_evidence && !productPayload) {
    warnings.push(warning("product_evidence_payload_unavailable", "Latest product_evidence payload could not be read for market fit scoring.", "product_evidence"));
  }

  return {
    firstRevenueAchieved,
    preferLowCostValidation: firstRevenueAchieved === false,
    boostTopics,
    seoEvidenceStrong: (latest.seo_evidence?.score ?? 0) >= 70,
    geoEvidenceStrong: (latest.geo_evidence?.score ?? 0) >= 70
  };
}

async function readPayload(entry?: EbosEvidenceCatalogEntry) {
  if (!entry) return null;
  try {
    const envelope = JSON.parse(await readFile(entry.filePath, "utf8")) as { payload?: unknown };
    return asRecord(envelope.payload);
  } catch {
    return null;
  }
}

function detectBoostTopicsFromProductEvidence(payload: Record<string, unknown> | null): EbosMarketTopic[] {
  const audits = arrayFrom(payload?.productAudits).map(asRecord).filter((audit): audit is Record<string, unknown> => Boolean(audit));
  const text = audits
    .filter((audit) => (readNumber(audit.score) ?? 0) >= 80)
    .map((audit) => `${readString(audit.slug) ?? ""} ${readString(audit.productName) ?? ""}`)
    .join(" ")
    .toLowerCase();
  const topics: EbosMarketTopic[] = [];
  if (/video|faceswap|人像|视频/.test(text)) topics.push("ai_video");
  if (/agent|browser|mcp/.test(text)) topics.push("ai_agent");
  if (/local|本地/.test(text)) topics.push("local_ai");
  return [...new Set(topics)];
}

function parseRssItems(xml: string) {
  const itemMatches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, 20);
  return itemMatches.map((match) => {
    const item = match[0];
    return {
      title: stripTags(readXmlTag(item, "title") ?? "Untitled RSS item"),
      description: stripTags(readXmlTag(item, "description") ?? ""),
      url: stripTags(readXmlTag(item, "link") ?? ""),
      publishedAt: stripTags(readXmlTag(item, "pubDate") ?? "")
    };
  });
}

function readXmlTag(xml: string, tag: string) {
  return xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1];
}

function stripTags(value: string) {
  return value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim();
}

function buildMarketSummary(signals: EbosMarketSignal[]): EbosMarketEvidence["marketSummary"] {
  return {
    topTopics: countValues(signals.flatMap((signal) => signal.detectedTopics)).map(([topic, count]) => ({ topic, count })).slice(0, 8),
    topUserProblems: countValues(signals.flatMap((signal) => signal.detectedUserProblems)).map(([problem, count]) => ({ problem, count })).slice(0, 8),
    topProductTypes: countValues(signals.flatMap((signal) => signal.detectedProductTypes)).map(([productType, count]) => ({ productType, count })).slice(0, 8)
  };
}

function buildSignalSummary(signals: EbosMarketSignal[]): EbosMarketEvidence["signalSummary"] {
  const manualSignals = signals.filter((signal) => signal.sourceType === "manual").length;
  const rssSignals = signals.filter((signal) => signal.sourceType === "rss").length;
  return {
    totalSignals: signals.length,
    manualSignals,
    rssSignals,
    networkSignals: signals.length - manualSignals,
    averageRelevanceScore: roundAverage(signals.map((signal) => signal.relevanceScore)),
    averageMonetizationScore: roundAverage(signals.map((signal) => signal.monetizationScore))
  };
}

function buildOpportunitySummary(opportunities: EbosMarketOpportunityScore[]): EbosMarketEvidence["opportunitySummary"] {
  return {
    totalOpportunities: opportunities.length,
    buildNowCount: opportunities.filter((item) => item.recommendedAction === "build_now").length,
    validateFirstCount: opportunities.filter((item) => item.recommendedAction === "validate_first").length,
    createContentFirstCount: opportunities.filter((item) => item.recommendedAction === "create_content_first").length,
    watchCount: opportunities.filter((item) => item.recommendedAction === "watch").length,
    ignoreCount: opportunities.filter((item) => item.recommendedAction === "ignore").length,
    highestPriorityScore: opportunities[0]?.priorityScore ?? 0
  };
}

function buildDataSourceSummary(
  signals: EbosMarketSignal[],
  warnings: EbosEvidenceWarning[],
  configuredSources: string[],
  unavailableSources: string[]
): EbosMarketDataSourceSummary {
  return {
    manualSignalsCount: signals.filter((signal) => signal.sourceType === "manual").length,
    rssSignalsCount: signals.filter((signal) => signal.sourceType === "rss").length,
    githubSignalsCount: signals.filter((signal) => signal.sourceType === "github").length,
    redditSignalsCount: signals.filter((signal) => signal.sourceType === "reddit").length,
    productHuntSignalsCount: signals.filter((signal) => signal.sourceType === "product_hunt").length,
    unavailableSources,
    configuredSources: signals.some((signal) => signal.sourceType === "manual")
      ? ["manual_input", ...configuredSources]
      : configuredSources,
    warnings: warnings.map((item) => item.message)
  };
}

function buildRisks(
  signals: EbosMarketSignal[],
  recommended: EbosMarketOpportunityScore[],
  dataSourceSummary: EbosMarketDataSourceSummary
) {
  const risks: string[] = [];
  if (signals.length === 0) risks.push("当前没有可用市场信号，不能生成高置信度产品方向。");
  if (dataSourceSummary.rssSignalsCount === 0) risks.push("当前 Market Evidence 主要来自 manual input，不能代表真实搜索量或销量。");
  if (recommended.some((item) => item.competitionRisk >= 6)) risks.push("部分机会竞争风险较高，需要用细分场景和交付物差异化。");
  return [...new Set(risks)];
}

function buildOpportunities(recommended: EbosMarketOpportunityScore[]) {
  return recommended.slice(0, 5).map((item) => `${item.productDirection}: ${item.nextActions[0] ?? item.description}`);
}

function buildActionItems(recommended: EbosMarketOpportunityScore[]) {
  return recommended.slice(0, 5).map((item, index) => ({
    id: `market-action-${index + 1}`,
    title: actionTitle(item),
    description: item.nextActions.join(" "),
    priority: item.priorityScore >= 80 ? "high" as const : item.priorityScore >= 65 ? "high" as const : "medium" as const,
    owner: "codex" as const,
    relatedSection: "market",
    evidenceRefs: item.evidenceSignalIds,
    status: "open" as const
  }));
}

function actionTitle(item: EbosMarketOpportunityScore) {
  if (item.recommendedAction === "build_now") return `编写产品 PRD 并准备上架：${item.productDirection}`;
  if (item.recommendedAction === "validate_first") return `验证市场机会：${item.productDirection}`;
  if (item.recommendedAction === "create_content_first") return `发布内容测试：${item.productDirection}`;
  return `观察市场机会：${item.productDirection}`;
}

function calculateMarketConfidence(
  signals: EbosMarketSignal[],
  dataSourceSummary: EbosMarketDataSourceSummary,
  warnings: EbosEvidenceWarning[]
): EbosConfidenceLevel {
  if (signals.length === 0) return "unknown";
  const networkSignals = dataSourceSummary.rssSignalsCount
    + dataSourceSummary.githubSignalsCount
    + dataSourceSummary.redditSignalsCount
    + dataSourceSummary.productHuntSignalsCount;
  if (networkSignals === 0) return "partial";
  return warnings.length ? "partial" : "complete";
}

function calculateOverallScore(opportunities: EbosMarketOpportunityScore[], confidence: EbosConfidenceLevel) {
  if (opportunities.length === 0) return 0;
  const top = opportunities.slice(0, 3);
  const score = roundAverage(top.map((item) => item.priorityScore));
  return confidence === "unknown" ? Math.min(score, 30) : score;
}

function resolvePeriod(options: BuildMarketEvidenceOptions, targetDate: string) {
  if (options.periodStart && options.periodEnd) {
    return {
      periodStart: toDateKey(options.periodStart),
      periodEnd: toDateKey(options.periodEnd)
    };
  }
  const weekly = getWeeklyWindow(new Date(`${targetDate}T12:00:00`));
  return {
    periodStart: toDateKey(weekly.start),
    periodEnd: toDateKey(weekly.end)
  };
}

function dedupeSignals(signals: EbosMarketSignal[]) {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    const key = `${signal.sourceType}:${signal.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countValues<T extends string>(values: T[]) {
  const counts = values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1]) as Array<[T, number]>;
}

function readBooleanPath(root: unknown, path: string[]) {
  let cursor = root;
  for (const key of path) {
    const record = asRecord(cursor);
    if (!record) return undefined;
    cursor = record[key];
  }
  return typeof cursor === "boolean" ? cursor : undefined;
}

function roundAverage(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function arrayFrom(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function warning(code: string, message: string, source?: string): EbosEvidenceWarning {
  return {
    code,
    severity: "warning",
    message,
    source
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}
