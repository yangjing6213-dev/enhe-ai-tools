import { basename } from "node:path";
import type { EbosConfidenceLevel, EbosScoreGrade } from "../types";
import {
  type EbosEvidenceActionItem,
  type EbosEvidenceEnvelope,
  type EbosEvidenceKind,
  type EbosEvidenceWarning
} from "./evidence-contract";
import type {
  EbosEvidenceCatalog,
  EbosEvidenceCatalogEntry,
  EbosEvidencePayloadSummary,
  EbosEvidenceValidationStatus
} from "./evidence-catalog-types";
import { summarizeEvidenceCatalog } from "./evidence-summary";
import {
  validateEvidenceEnvelope,
  type EbosEvidenceValidationIssue
} from "./evidence-validator";

export function createEmptyEvidenceCatalog(options: {
  generatedAt?: string | Date;
  rootDir: string;
}): EbosEvidenceCatalog {
  const generatedAt = toIsoString(options.generatedAt ?? new Date());

  return {
    catalogVersion: "ebos-evidence-catalog-v1",
    generatedAt,
    rootDir: normalizePath(options.rootDir),
    totalEntries: 0,
    entries: [],
    summary: summarizeEvidenceCatalog([])
  };
}

export function createEvidenceCatalog(options: {
  generatedAt?: string | Date;
  rootDir: string;
  entries: EbosEvidenceCatalogEntry[];
}): EbosEvidenceCatalog {
  const generatedAt = toIsoString(options.generatedAt ?? new Date());
  const entries = [...options.entries].sort((a, b) => a.filePath.localeCompare(b.filePath));

  return {
    catalogVersion: "ebos-evidence-catalog-v1",
    generatedAt,
    rootDir: normalizePath(options.rootDir),
    totalEntries: entries.length,
    entries,
    summary: summarizeEvidenceCatalog(entries)
  };
}

export function createEvidenceCatalogEntry(
  filePath: string,
  envelope: EbosEvidenceEnvelope<unknown>
): EbosEvidenceCatalogEntry {
  const validation = validateEvidenceEnvelope(envelope);
  const validationStatus = getValidationStatus(envelope, validation.issues);
  const fileName = basename(normalizePath(filePath));
  const meta = envelope.meta;
  const quality = envelope.quality;
  const warnings = Array.isArray(envelope.warnings) ? envelope.warnings : [];
  const actionItems = Array.isArray(envelope.actionItems) ? envelope.actionItems : [];

  return {
    id: createEntryId(meta.evidenceKind, meta.targetDate, fileName),
    filePath: normalizePath(filePath),
    fileName,
    evidenceKind: meta.evidenceKind,
    contractVersion: String(meta.contractVersion),
    targetDate: String(meta.targetDate),
    generatedAt: String(meta.generatedAt),
    periodStart: meta.periodStart,
    periodEnd: meta.periodEnd,
    siteUrl: meta.siteUrl,
    environment: meta.environment,
    generator: String(meta.generator),
    score: readScore(quality.score),
    grade: readGrade(quality.grade),
    confidence: readConfidence(quality.confidence),
    dataCompleteness: readConfidence(quality.dataCompleteness),
    warningsCount: readCount(quality.warningsCount, warnings.length),
    errorsCount: readCount(quality.errorsCount, warnings.filter((warning) => warning.severity === "critical").length),
    actionItemsCount: actionItems.length,
    missingSources: quality.missingSources?.length ? [...quality.missingSources] : undefined,
    validationStatus,
    validationIssues: validation.issues.length ? validation.issues : undefined,
    payloadSummary: validationStatus === "invalid" ? undefined : summarizePayload(envelope),
    warnings,
    actionItems
  };
}

export function createInvalidEvidenceCatalogEntry(options: {
  filePath: string;
  evidenceKind: EbosEvidenceKind;
  issue: EbosEvidenceValidationIssue;
  generatedAt?: string | Date;
}): EbosEvidenceCatalogEntry {
  const fileName = basename(normalizePath(options.filePath));
  const generatedAt = toIsoString(options.generatedAt ?? new Date());
  const targetDate = readDateFromFileName(fileName) ?? generatedAt.slice(0, 10);

  return {
    id: createEntryId(options.evidenceKind, targetDate, fileName),
    filePath: normalizePath(options.filePath),
    fileName,
    evidenceKind: options.evidenceKind,
    contractVersion: "unknown",
    targetDate,
    generatedAt,
    generator: "unknown",
    confidence: "unknown",
    warningsCount: 0,
    errorsCount: 1,
    actionItemsCount: 0,
    validationStatus: "invalid",
    validationIssues: [options.issue]
  };
}

function getValidationStatus(
  envelope: EbosEvidenceEnvelope<unknown>,
  issues: EbosEvidenceValidationIssue[]
): EbosEvidenceValidationStatus {
  if (issues.length > 0) return "invalid";

  if ((envelope.warnings?.length ?? 0) > 0 || (envelope.quality.warningsCount ?? 0) > 0) {
    return "valid_with_warnings";
  }

  return "valid";
}

function summarizePayload(envelope: EbosEvidenceEnvelope<unknown>): EbosEvidencePayloadSummary {
  if (envelope.meta.evidenceKind === "health_snapshot") {
    return summarizeHealthSnapshot(envelope);
  }

  if (envelope.meta.evidenceKind === "data_source_readiness") {
    return summarizeDataSourceReadiness(envelope);
  }

  if (envelope.meta.evidenceKind === "weekly_report") {
    return summarizeWeeklyReport(envelope);
  }

  if (envelope.meta.evidenceKind === "monthly_review") {
    return summarizeMonthlyReview(envelope);
  }

  if (envelope.meta.evidenceKind === "seo_evidence") {
    return summarizeSeoEvidence(envelope);
  }

  if (envelope.meta.evidenceKind === "geo_evidence") {
    return summarizeGeoEvidence(envelope);
  }

  if (envelope.meta.evidenceKind === "product_evidence") {
    return summarizeProductEvidence(envelope);
  }

  if (envelope.meta.evidenceKind === "revenue_evidence") {
    return summarizeRevenueEvidence(envelope);
  }

  if (envelope.meta.evidenceKind === "market_evidence") {
    return summarizeMarketEvidence(envelope);
  }

  if (envelope.meta.evidenceKind === "competitor_evidence") {
    return summarizeCompetitorEvidence(envelope);
  }

  return { summaryType: "unknown" };
}

function summarizeHealthSnapshot(envelope: EbosEvidenceEnvelope<unknown>): EbosEvidencePayloadSummary {
  const payload = asRecord(envelope.payload) ?? {};
  const score = asRecord(payload.score);
  const snapshot = asRecord(payload.snapshot);
  const commands = arrayFrom(snapshot?.commands);
  const failedChecks = commands
    .map(asRecord)
    .filter((command): command is Record<string, unknown> => Boolean(command))
    .filter((command) => command.status === "failed")
    .map((command) => readString(command.key) ?? readString(command.label) ?? "unknown");
  const keyProductPages = commands
    .map(asRecord)
    .filter((command): command is Record<string, unknown> => Boolean(command))
    .filter((command) => command.key === "key_product_pages");

  if (!score && !snapshot) return { summaryType: "unknown" };

  return {
    score: readScore(score?.score) ?? envelope.quality.score,
    grade: readGrade(score?.grade) ?? envelope.quality.grade,
    failedChecks,
    smokeChecksCount: commands.filter((command) => {
      const key = readString(asRecord(command)?.key);
      return key === "sitemap" || key === "robots" || key === "homepage" || key === "key_product_pages";
    }).length,
    keyProductPagesStatus: {
      total: keyProductPages.length,
      passed: keyProductPages.filter((command) => command.status === "passed").length,
      failed: keyProductPages.filter((command) => command.status === "failed").length
    }
  };
}

function summarizeDataSourceReadiness(envelope: EbosEvidenceEnvelope<unknown>): EbosEvidencePayloadSummary {
  const payload = asRecord(envelope.payload) ?? {};
  const summary = asRecord(payload.summary);
  const checks = arrayFrom(payload.checks).map(asRecord).filter((check): check is Record<string, unknown> => Boolean(check));
  const missingIntegrations = checks
    .filter((check) => ["missing_config", "not_configured", "unavailable", "unknown"].includes(String(check.status)))
    .map((check) => readString(check.key))
    .filter((key): key is string => Boolean(key));

  if (!summary && checks.length === 0) return { summaryType: "unknown" };

  return {
    configuredCount: readNumber(summary?.configured) ?? countStatus(checks, "configured"),
    availableCount: readNumber(summary?.available) ?? countStatus(checks, "available"),
    missingConfigCount: readNumber(summary?.missing_config) ?? countStatus(checks, "missing_config"),
    missingIntegrations
  };
}

function summarizeWeeklyReport(envelope: EbosEvidenceEnvelope<unknown>): EbosEvidencePayloadSummary {
  const payload = asRecord(envelope.payload) ?? {};
  const report = asRecord(payload.report) ?? payload;
  const nextWeekPlan = asRecord(payload.nextWeekPlan);
  const reportActionItems = arrayFrom(report.actionItems);
  const planActionItems = arrayFrom(nextWeekPlan?.actionItems);
  const actionItems = reportActionItems.length ? reportActionItems : planActionItems;

  return {
    weeklyScore: readScore(report.overallScore) ?? envelope.quality.score,
    topActionItems: actionItems
      .map(asRecord)
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .slice(0, 5)
      .map((item) => readString(item.title) ?? "Untitled action item"),
    sectionCount: arrayFrom(report.sections).length,
    confidence: readConfidence(report.confidence) ?? envelope.quality.confidence
  };
}

function summarizeMonthlyReview(envelope: EbosEvidenceEnvelope<unknown>): EbosEvidencePayloadSummary {
  const payload = asRecord(envelope.payload) ?? {};

  return {
    overallScore: readScore(payload.overallScore) ?? envelope.quality.score,
    evidenceUsedCount: arrayFrom(payload.evidenceUsed).length,
    majorRisksCount: arrayFrom(payload.majorRisks).length,
    nextMonthOKRsCount: arrayFrom(payload.nextMonthOKRs).length,
    confidence: readConfidence(payload.confidence) ?? envelope.quality.confidence
  };
}

function summarizeSeoEvidence(envelope: EbosEvidenceEnvelope<unknown>): EbosEvidencePayloadSummary {
  const payload = asRecord(envelope.payload) ?? {};

  return {
    summaryType: "seo_evidence",
    overallScore: readScore(payload.overallScore) ?? envelope.quality.score,
    pagesAudited: readNumber(payload.pagesAudited) ?? 0,
    technicalRisksCount: arrayFrom(payload.risks).length,
    actionItemsCount: arrayFrom(payload.actionItems).length || envelope.actionItems.length,
    confidence: readConfidence(payload.confidence) ?? envelope.quality.confidence
  };
}

function summarizeGeoEvidence(envelope: EbosEvidenceEnvelope<unknown>): EbosEvidencePayloadSummary {
  const payload = asRecord(envelope.payload) ?? {};
  const pageAudits = arrayFrom(payload.pageAudits)
    .map(asRecord)
    .filter((page): page is Record<string, unknown> => Boolean(page));
  const citationScores = pageAudits
    .map((page) => readNumber(page.citationReadinessScore))
    .filter((score): score is number => typeof score === "number");

  return {
    summaryType: "geo_evidence",
    overallScore: readScore(payload.overallScore) ?? envelope.quality.score,
    pagesAudited: readNumber(payload.pagesAudited) ?? 0,
    citationReadinessAverage: citationScores.length
      ? Math.round(citationScores.reduce((total, score) => total + score, 0) / citationScores.length)
      : 0,
    actionItemsCount: arrayFrom(payload.actionItems).length || envelope.actionItems.length,
    confidence: readConfidence(payload.confidence) ?? envelope.quality.confidence
  };
}

function summarizeProductEvidence(envelope: EbosEvidenceEnvelope<unknown>): EbosEvidencePayloadSummary {
  const payload = asRecord(envelope.payload) ?? {};
  const databaseSummary = asRecord(payload.databaseSummary);

  return {
    summaryType: "product_evidence",
    overallScore: readScore(payload.overallScore) ?? envelope.quality.score,
    productsAudited: readNumber(payload.productsAudited) ?? 0,
    conversionRisksCount: arrayFrom(payload.risks).length,
    actionItemsCount: arrayFrom(payload.actionItems).length || envelope.actionItems.length,
    confidence: readConfidence(payload.confidence) ?? envelope.quality.confidence,
    databaseSummary: databaseSummary ?? undefined
  };
}

function summarizeRevenueEvidence(envelope: EbosEvidenceEnvelope<unknown>): EbosEvidencePayloadSummary {
  const payload = asRecord(envelope.payload) ?? {};
  const revenueSummary = asRecord(payload.revenueSummary) ?? {};
  const orderSummary = asRecord(payload.orderSummary) ?? {};
  const productRevenueSummary = asRecord(payload.productRevenueSummary) ?? {};
  const productMetrics = arrayFrom(productRevenueSummary.productMetrics)
    .map(asRecord)
    .filter((metric): metric is Record<string, unknown> => Boolean(metric))
    .sort((a, b) => (readNumber(b.netRevenue) ?? 0) - (readNumber(a.netRevenue) ?? 0))
    .slice(0, 5)
    .map((metric) => ({
      productSlug: readString(metric.productSlug),
      productName: readString(metric.productName),
      netRevenue: readNumber(metric.netRevenue) ?? 0,
      paidOrdersCount: readNumber(metric.paidOrdersCount) ?? 0
    }));

  return {
    summaryType: "revenue_evidence",
    overallScore: readScore(payload.overallScore) ?? envelope.quality.score,
    grossRevenue: readNumber(revenueSummary.grossRevenue) ?? 0,
    netRevenue: readNumber(revenueSummary.netRevenue) ?? 0,
    totalOrders: readNumber(orderSummary.totalOrders) ?? 0,
    paidOrders: readNumber(orderSummary.paidOrders) ?? 0,
    firstRevenueAchieved: Boolean(revenueSummary.firstRevenueAchieved),
    topProductRevenueMetrics: productMetrics,
    actionItemsCount: arrayFrom(payload.actionItems).length || envelope.actionItems.length,
    confidence: readConfidence(payload.confidence) ?? envelope.quality.confidence
  };
}

function summarizeMarketEvidence(envelope: EbosEvidenceEnvelope<unknown>): EbosEvidencePayloadSummary {
  const payload = asRecord(envelope.payload) ?? {};
  const directions = arrayFrom(payload.recommendedProductDirections)
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .sort((a, b) => (readNumber(b.priorityScore) ?? 0) - (readNumber(a.priorityScore) ?? 0))
    .slice(0, 5)
    .map((item) => ({
      productDirection: readString(item.productDirection) ?? "unknown",
      priorityScore: readNumber(item.priorityScore) ?? 0,
      recommendedAction: readString(item.recommendedAction) ?? "watch"
    }));

  return {
    summaryType: "market_evidence",
    overallScore: readScore(payload.overallScore) ?? envelope.quality.score,
    signalsCount: arrayFrom(payload.signals).length,
    recommendedProductDirectionsCount: arrayFrom(payload.recommendedProductDirections).length,
    topProductDirections: directions,
    actionItemsCount: arrayFrom(payload.actionItems).length || envelope.actionItems.length,
    confidence: readConfidence(payload.confidence) ?? envelope.quality.confidence
  };
}

function summarizeCompetitorEvidence(envelope: EbosEvidenceEnvelope<unknown>): EbosEvidencePayloadSummary {
  const payload = asRecord(envelope.payload) ?? {};
  const summary = asRecord(payload.competitorSummary) ?? {};
  const dataSourceSummary = asRecord(payload.dataSourceSummary) ?? {};
  const opportunities = arrayFrom(payload.differentiationOpportunities)
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .sort((a, b) => (readNumber(b.priorityScore) ?? 0) - (readNumber(a.priorityScore) ?? 0))
    .slice(0, 5)
    .map((item) => ({
      title: readString(item.title) ?? "unknown",
      priorityScore: readNumber(item.priorityScore) ?? 0,
      recommendedAction: readString(item.recommendedAction) ?? "watch"
    }));

  return {
    summaryType: "competitor_evidence",
    overallScore: readScore(payload.overallScore) ?? envelope.quality.score,
    competitorsCount: readNumber(summary.competitorsCount) ?? 0,
    competitorsAuditedCount: readNumber(summary.competitorsAuditedCount) ?? 0,
    includeNetworkSources: dataSourceSummary.networkSourcesEnabled === true,
    pagesAttempted: readNumber(dataSourceSummary.pagesAttempted) ?? 0,
    pagesSucceeded: readNumber(dataSourceSummary.pagesSucceeded) ?? 0,
    pagesFailed: readNumber(dataSourceSummary.pagesFailed) ?? 0,
    opportunitiesCount: arrayFrom(payload.differentiationOpportunities).length,
    topDifferentiationOpportunities: opportunities,
    actionItemsCount: arrayFrom(payload.actionItems).length || envelope.actionItems.length,
    confidence: readConfidence(payload.confidence) ?? envelope.quality.confidence
  };
}

function createEntryId(kind: EbosEvidenceKind, targetDate: string, fileName: string) {
  return `${kind}:${targetDate}:${fileName}`;
}

function normalizePath(filePath: string) {
  return filePath.replace(/\\/g, "/");
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function readDateFromFileName(fileName: string) {
  return fileName.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
}

function readCount(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function readScore(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readGrade(value: unknown): EbosScoreGrade | undefined {
  return ["excellent", "good", "warning", "critical", "unknown"].includes(String(value))
    ? value as EbosScoreGrade
    : undefined;
}

function readConfidence(value: unknown): EbosConfidenceLevel {
  return ["unknown", "unavailable", "partial", "complete"].includes(String(value))
    ? value as EbosConfidenceLevel
    : "unknown";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function arrayFrom(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function countStatus(checks: Record<string, unknown>[], status: string) {
  return checks.filter((check) => check.status === status).length;
}

export type {
  EbosEvidenceCatalog,
  EbosEvidenceCatalogEntry,
  EbosEvidencePayloadSummary
} from "./evidence-catalog-types";
