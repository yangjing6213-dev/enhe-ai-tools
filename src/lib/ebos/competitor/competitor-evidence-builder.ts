import { readFile } from "node:fs/promises";
import { getWeeklyWindow } from "../date-window";
import {
  readEvidenceCatalog,
  type EbosEvidenceCatalogEntry,
  type EbosEvidenceWarning
} from "../evidence";
import type { EbosConfidenceLevel } from "../types";
import {
  loadCompetitorManualInput
} from "./competitor-input";
import {
  runCompetitorSiteAudit
} from "./competitor-site-auditor";
import {
  rankCompetitorOpportunities,
  scoreCompetitorOpportunities
} from "./competitor-opportunity-scorer";
import type {
  BuildCompetitorEvidenceOptions,
  EbosCompetitorAudit,
  EbosCompetitorDataSourceSummary,
  EbosCompetitorEvidence,
  EbosCompetitorOpportunity
} from "./competitor-evidence-types";

const DEFAULT_CATALOG_PATH = "reports/ebos/evidence/catalog/latest-evidence-catalog.json";

type CompetitorEvidenceContext = {
  marketEvidence?: unknown;
  productEvidence?: unknown;
  revenueEvidence?: unknown;
  seoEvidence?: unknown;
  geoEvidence?: unknown;
};

export async function buildCompetitorEvidence(
  options: BuildCompetitorEvidenceOptions = {}
): Promise<EbosCompetitorEvidence> {
  const generatedAt = toIsoString(options.generatedAt ?? new Date());
  const targetDate = toDateKey(options.targetDate ?? generatedAt);
  const period = resolvePeriod(options, targetDate);
  const warnings: EbosEvidenceWarning[] = [];
  const manualInput = await loadCompetitorManualInput({
    input: options.manualInput,
    filePath: options.manualInputPath
  });
  warnings.push(...manualInput.warnings);

  const siteAudit = await runCompetitorSiteAudit({
    seeds: manualInput.seeds,
    includeNetworkSources: options.includeNetworkSources ?? false,
    fetcher: options.fetcher,
    maxCompetitors: options.maxCompetitors,
    maxPagesPerCompetitor: options.maxPagesPerCompetitor,
    maxTotalUrls: options.maxTotalUrls,
    requestTimeoutMs: options.requestTimeoutMs
  });
  warnings.push(...siteAudit.warnings);
  if (shouldWarnThinPublicAudit(options.includeNetworkSources === true, siteAudit)) {
    warnings.push({
      code: "competitor_public_audit_thin",
      severity: "warning",
      source: "market_research",
      message: "Public competitor URL audit was enabled, but successful page coverage is too thin for complete competitor confidence."
    });
  }

  const evidenceContext = await readEvidenceContext(
    options.catalogPath ?? DEFAULT_CATALOG_PATH,
    warnings
  );
  const differentiationOpportunities = ensureOpportunities(rankCompetitorOpportunities(scoreCompetitorOpportunities({
    competitorAudits: siteAudit.competitorAudits,
    marketEvidence: evidenceContext.marketEvidence,
    productEvidence: evidenceContext.productEvidence,
    revenueEvidence: evidenceContext.revenueEvidence,
    seoEvidence: evidenceContext.seoEvidence,
    geoEvidence: evidenceContext.geoEvidence
  })));
  const competitorSummary = buildCompetitorSummary(siteAudit.competitorAudits);
  const dataSourceSummary = buildDataSourceSummary({
    defaultSeedsCount: options.manualInput?.seeds?.length ? 0 : manualInput.seeds.length,
    manualSeedsCount: manualInput.seeds.filter((seed) => seed.source === "manual" || seed.source === "user_input").length,
    networkSourcesEnabled: options.includeNetworkSources === true,
    pagesAttempted: siteAudit.pagesAttempted,
    pagesSucceeded: siteAudit.pagesSucceeded,
    pagesFailed: siteAudit.pagesFailed,
    warnings
  });
  const confidence = calculateCompetitorConfidence(dataSourceSummary, warnings);
  const overallScore = calculateOverallScore(differentiationOpportunities, siteAudit.competitorAudits, confidence);

  return {
    evidenceType: "competitor_evidence",
    targetDate,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    generatedAt,
    overallScore,
    confidence,
    competitorSummary,
    competitorAudits: siteAudit.competitorAudits,
    categoryInsights: buildCategoryInsights(siteAudit.competitorAudits),
    pricingInsights: buildPricingInsights(siteAudit.competitorAudits, evidenceContext.revenueEvidence),
    seoInsights: buildSeoInsights(siteAudit.competitorAudits),
    geoInsights: buildGeoInsights(siteAudit.competitorAudits),
    productGapInsights: buildProductGapInsights(differentiationOpportunities),
    differentiationOpportunities,
    risks: buildRisks(siteAudit.competitorAudits, dataSourceSummary, warnings),
    opportunities: differentiationOpportunities.slice(0, 5).map((item) => item.description),
    actionItems: buildActionItems(differentiationOpportunities),
    warnings,
    dataSourceSummary
  };
}

async function readEvidenceContext(
  catalogPath: string,
  warnings: EbosEvidenceWarning[]
): Promise<CompetitorEvidenceContext> {
  const catalog = await readEvidenceCatalog({ catalogPath });
  if (!catalog) return {};
  const latest = catalog.summary.latestByKind;
  const context = {
    marketEvidence: await readPayload(latest.market_evidence),
    productEvidence: await readPayload(latest.product_evidence),
    revenueEvidence: await readPayload(latest.revenue_evidence),
    seoEvidence: await readPayload(latest.seo_evidence),
    geoEvidence: await readPayload(latest.geo_evidence)
  };

  for (const [kind, payload] of Object.entries(context)) {
    const evidenceKind = kind.replace("Evidence", "_evidence");
    const entry = latest[evidenceKind as keyof typeof latest];
    if (entry && !payload) {
      warnings.push({
        code: "competitor_context_payload_unavailable",
        severity: "warning",
        source: "market_research",
        message: `Latest ${evidenceKind} payload could not be read for competitor evidence context.`
      });
    }
  }

  return context;
}

async function readPayload(entry?: EbosEvidenceCatalogEntry) {
  if (!entry) return undefined;
  try {
    const envelope = JSON.parse(await readFile(entry.filePath, "utf8")) as { payload?: unknown };
    return envelope.payload;
  } catch {
    return undefined;
  }
}

function ensureOpportunities(opportunities: EbosCompetitorOpportunity[]) {
  if (opportunities.length > 0) return opportunities.slice(0, 8);

  return [{
    id: "competitor-baseline-validation",
    title: "Validate ENHE competitor differentiation baseline",
    description: "Use default competitor seeds to define one low-cost ENHE differentiation test before building large competitor-facing features.",
    relatedCompetitors: [],
    relatedMarketDirections: [],
    opportunityType: "product_gap" as const,
    priorityScore: 58,
    enheFitScore: 18,
    difficultyScore: 3,
    riskScore: 5,
    recommendedAction: "create_content_first" as const,
    suggestedCodexTasks: [
      "Create a competitor differentiation checklist for one ENHE product direction.",
      "Draft a validation landing page outline."
    ],
    risks: ["No audited competitor page data is available yet."]
  }];
}

function buildCompetitorSummary(audits: EbosCompetitorAudit[]) {
  const pagesAudited = audits.reduce((total, audit) => total + audit.pagesAudited, 0);
  const scoredAudits = audits.filter((audit) => audit.averageScore > 0);
  return {
    competitorsCount: audits.length,
    competitorsAuditedCount: audits.filter((audit) => audit.pagesAudited > 0).length,
    pagesAuditedCount: pagesAudited,
    averageCompetitorPageScore: average(scoredAudits.map((audit) => audit.averageScore))
  };
}

function buildDataSourceSummary(input: {
  defaultSeedsCount: number;
  manualSeedsCount: number;
  networkSourcesEnabled: boolean;
  pagesAttempted: number;
  pagesSucceeded: number;
  pagesFailed: number;
  warnings: EbosEvidenceWarning[];
}): EbosCompetitorDataSourceSummary {
  return {
    seedSources: ["manual_input"],
    defaultSeedsCount: input.defaultSeedsCount,
    manualSeedsCount: input.manualSeedsCount,
    networkSourcesEnabled: input.networkSourcesEnabled,
    pagesAttempted: input.pagesAttempted,
    pagesSucceeded: input.pagesSucceeded,
    pagesFailed: input.pagesFailed,
    warnings: input.warnings.map((warning) => warning.message)
  };
}

function calculateCompetitorConfidence(
  summary: EbosCompetitorDataSourceSummary,
  _warnings: EbosEvidenceWarning[]
): EbosConfidenceLevel {
  if (summary.defaultSeedsCount + summary.manualSeedsCount === 0) return "unknown";
  if (!summary.networkSourcesEnabled || summary.pagesSucceeded === 0) return "partial";
  if (summary.pagesSucceeded < 2 || summary.pagesFailed > 0) return "partial";
  return "complete";
}

function shouldWarnThinPublicAudit(
  includeNetworkSources: boolean,
  siteAudit: {
    competitorsAuditedCount: number;
    pagesAttempted: number;
    pagesSucceeded: number;
    pagesFailed: number;
  }
) {
  if (!includeNetworkSources) return false;
  if (siteAudit.competitorsAuditedCount === 0) return true;
  if (siteAudit.pagesSucceeded < 2) return true;
  if (siteAudit.pagesFailed > 0) return true;
  return siteAudit.pagesAttempted === 0;
}

function calculateOverallScore(
  opportunities: EbosCompetitorOpportunity[],
  audits: EbosCompetitorAudit[],
  confidence: EbosConfidenceLevel
) {
  const opportunityScore = average(opportunities.slice(0, 3).map((item) => item.priorityScore));
  const auditScore = average(audits.filter((audit) => audit.averageScore > 0).map((audit) => audit.averageScore));
  const score = opportunityScore || auditScore || 45;
  return confidence === "unknown" ? Math.min(score, 30) : score;
}

function buildCategoryInsights(audits: EbosCompetitorAudit[]) {
  const counts = countValues(audits.map((audit) => audit.category));
  return counts.map(([category, count]) => `${category}: ${count} observation targets.`);
}

function buildPricingInsights(audits: EbosCompetitorAudit[], revenueEvidence: unknown) {
  const pricingSignals = unique(audits.flatMap((audit) => audit.pricingSignals));
  const firstRevenueAchieved = readBooleanPath(revenueEvidence, ["revenueSummary", "firstRevenueAchieved"]) === true;
  return [
    pricingSignals.length
      ? `Observed pricing terms: ${pricingSignals.join(", ")}.`
      : "No audited pricing terms are available yet.",
    firstRevenueAchieved
      ? "Revenue evidence has first revenue; compare competitor pricing against existing paid products."
      : "First revenue is not proven; prefer validation pricing, waitlist, presale, or manual payment tests."
  ];
}

function buildSeoInsights(audits: EbosCompetitorAudit[]) {
  const strengths = unique(audits.flatMap((audit) => audit.seoStrengths));
  return strengths.length
    ? [`Observed SEO page structure signals: ${strengths.join(", ")}.`]
    : ["SEO competitor structure is currently based on seed-level observation only."];
}

function buildGeoInsights(audits: EbosCompetitorAudit[]) {
  const strengths = unique(audits.flatMap((audit) => audit.geoStrengths));
  return strengths.length
    ? [`Observed GEO answerability signals: ${strengths.join(", ")}.`]
    : ["GEO competitor signals require audited pages with FAQ, how-to, source/date, and author evidence."];
}

function buildProductGapInsights(opportunities: EbosCompetitorOpportunity[]) {
  return opportunities
    .filter((item) => item.opportunityType === "product_gap" || item.opportunityType === "content_gap")
    .slice(0, 5)
    .map((item) => `${item.title}: priority=${item.priorityScore}, action=${item.recommendedAction}`);
}

function buildRisks(
  audits: EbosCompetitorAudit[],
  summary: EbosCompetitorDataSourceSummary,
  warnings: EbosEvidenceWarning[]
) {
  const risks = [
    "Competitor evidence does not fabricate competitor sales, traffic, or revenue.",
    ...(summary.networkSourcesEnabled ? [] : ["Public competitor URL reads are disabled; insights are seed-driven and partial."]),
    ...(audits.every((audit) => audit.pagesAudited === 0) ? ["No competitor public pages were audited in this run."] : []),
    ...warnings.map((warning) => warning.message)
  ];
  return unique(risks).slice(0, 8);
}

function buildActionItems(opportunities: EbosCompetitorOpportunity[]) {
  return opportunities.slice(0, 5).map((item, index) => ({
    id: `competitor-action-${index + 1}`,
    title: item.title,
    description: item.suggestedCodexTasks.join(" "),
    priority: item.priorityScore >= 65 ? "high" as const : "medium" as const,
    owner: "codex" as const,
    relatedSection: "competitor",
    evidenceRefs: item.relatedCompetitors,
    status: "open" as const
  }));
}

function resolvePeriod(options: BuildCompetitorEvidenceOptions, targetDate: string) {
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

function readBooleanPath(root: unknown, path: string[]) {
  let cursor = root;
  for (const key of path) {
    const record = asRecord(cursor);
    if (!record) return undefined;
    cursor = record[key];
  }
  return typeof cursor === "boolean" ? cursor : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function countValues<T extends string>(values: T[]) {
  const counts = values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1]) as Array<[T, number]>;
}
