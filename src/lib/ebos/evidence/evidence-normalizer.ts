import type {
  EbosActionItem,
  EbosConfidenceLevel,
  EbosScoreGrade,
  EbosWarning
} from "../types";
import {
  type EbosEvidenceActionItem,
  type EbosEvidenceEnvelope,
  type EbosEvidenceEnvironment,
  type EbosEvidenceKind,
  type EbosEvidenceWarning
} from "./evidence-contract";
import { EBOS_EVIDENCE_CONTRACT_VERSION } from "./evidence-contract-version";

export type EvidenceWrapOptions = {
  targetDate?: string | Date;
  generatedAt?: string | Date;
  periodStart?: string | Date;
  periodEnd?: string | Date;
  siteUrl?: string;
  environment?: EbosEvidenceEnvironment;
  generator: string;
  sourceFiles?: string[];
  schemaNotes?: string[];
};

type NormalizedQualityInput = {
  score?: number | null;
  grade?: EbosScoreGrade;
  confidence?: EbosConfidenceLevel;
  dataCompleteness?: EbosConfidenceLevel;
  missingSources?: string[];
};

export function wrapHealthSnapshotEvidence(
  input: unknown,
  options: EvidenceWrapOptions
): EbosEvidenceEnvelope<unknown> {
  const payload = input;
  const root = asRecord(input);
  const snapshot = recordOrNull(root.snapshot) ?? root;
  const score = asRecord(root.score);
  const warnings = normalizeEvidenceWarnings([
    ...arrayFrom(score.risks),
    ...buildHealthCommandWarnings(snapshot.commands)
  ]);

  return createEnvelope("health_snapshot", payload, options, {
    score: readNumber(score.score),
    grade: readGrade(score.grade),
    confidence: readConfidence(score.confidence) ?? "partial",
    dataCompleteness: warnings.length ? "partial" : "complete",
    missingSources: buildHealthMissingSources(snapshot.commands)
  }, warnings, []);
}

export function wrapDataSourceReadinessEvidence(
  input: unknown,
  options: EvidenceWrapOptions
): EbosEvidenceEnvelope<unknown> {
  const root = asRecord(input);
  const checks = arrayFrom(root.checks);
  const missingSources = checks
    .map(asRecord)
    .filter((check): check is Record<string, unknown> => Boolean(check))
    .filter((check) => ["missing_config", "not_configured", "unavailable", "unknown"].includes(String(check.status)))
    .map((check) => String(check.key))
    .filter(Boolean);
  const warnings = normalizeEvidenceWarnings(missingSources.map((source) => ({
    code: "missing_data",
    severity: "warning",
    message: `${source} is not available for EBOS evidence.`,
    source
  })));

  return createEnvelope("data_source_readiness", input, options, {
    confidence: missingSources.length ? "partial" : "complete",
    dataCompleteness: missingSources.length ? "partial" : "complete",
    missingSources
  }, warnings, []);
}

export function wrapWeeklyReportEvidence(
  input: unknown,
  options: EvidenceWrapOptions
): EbosEvidenceEnvelope<unknown> {
  const root = asRecord(input);
  const report = recordOrNull(root.report) ?? root;
  const period = asRecord(report.period);
  const warnings = normalizeEvidenceWarnings(arrayFrom(report.warnings));
  const actionItems = normalizeEvidenceActionItems(arrayFrom(report.actionItems));

  return createEnvelope("weekly_report", input, {
    ...options,
    periodStart: options.periodStart ?? readDateKey(period.start),
    periodEnd: options.periodEnd ?? readDateKey(period.end)
  }, {
    score: readNumber(report.overallScore),
    confidence: readConfidence(report.confidence) ?? "partial",
    dataCompleteness: warnings.length ? "partial" : "complete",
    missingSources: unique(warnings.map((warning) => warning.source).filter(isString))
  }, warnings, actionItems);
}

export function wrapMonthlyReviewEvidence(
  input: unknown,
  options: EvidenceWrapOptions
): EbosEvidenceEnvelope<unknown> {
  const root = asRecord(input);
  const warnings = normalizeEvidenceWarnings(arrayFrom(root.warnings));
  const actionItems = normalizeEvidenceActionItems(arrayFrom(root.actionItems));

  return createEnvelope("monthly_review", input, {
    ...options,
    periodStart: options.periodStart ?? readDateKey(root.periodStart),
    periodEnd: options.periodEnd ?? readDateKey(root.periodEnd)
  }, {
    score: readNumber(root.overallScore),
    confidence: readConfidence(root.confidence) ?? "partial",
    dataCompleteness: warnings.length ? "partial" : "complete",
    missingSources: arrayFrom(root.dataGaps).filter(isString)
  }, warnings, actionItems);
}

export function wrapSeoEvidence(
  input: unknown,
  options: EvidenceWrapOptions
): EbosEvidenceEnvelope<unknown> {
  const root = asRecord(input);
  const warnings = normalizeEvidenceWarnings(arrayFrom(root.warnings));
  const actionItems = normalizeEvidenceActionItems(arrayFrom(root.actionItems));

  return createEnvelope("seo_evidence", input, options, {
    score: readNumber(root.overallScore),
    confidence: readConfidence(root.confidence) ?? "partial",
    dataCompleteness: warnings.length ? "partial" : "complete",
    missingSources: warnings.map((warning) => warning.source).filter(isString)
  }, warnings, actionItems);
}

export function wrapGeoEvidence(
  input: unknown,
  options: EvidenceWrapOptions
): EbosEvidenceEnvelope<unknown> {
  const root = asRecord(input);
  const warnings = normalizeEvidenceWarnings(arrayFrom(root.warnings));
  const actionItems = normalizeEvidenceActionItems(arrayFrom(root.actionItems));

  return createEnvelope("geo_evidence", input, options, {
    score: readNumber(root.overallScore),
    confidence: readConfidence(root.confidence) ?? "partial",
    dataCompleteness: warnings.length ? "partial" : "complete",
    missingSources: warnings.map((warning) => warning.source).filter(isString)
  }, warnings, actionItems);
}

export function wrapProductEvidence(
  input: unknown,
  options: EvidenceWrapOptions
): EbosEvidenceEnvelope<unknown> {
  const root = asRecord(input);
  const warnings = normalizeEvidenceWarnings(arrayFrom(root.warnings));
  const actionItems = normalizeEvidenceActionItems(arrayFrom(root.actionItems));

  return createEnvelope("product_evidence", input, options, {
    score: readNumber(root.overallScore),
    confidence: readConfidence(root.confidence) ?? "partial",
    dataCompleteness: warnings.length ? "partial" : "complete",
    missingSources: warnings.map((warning) => warning.source).filter(isString)
  }, warnings, actionItems);
}

export function wrapRevenueEvidence(
  input: unknown,
  options: EvidenceWrapOptions
): EbosEvidenceEnvelope<unknown> {
  const root = asRecord(input);
  const warnings = normalizeEvidenceWarnings(arrayFrom(root.warnings));
  const actionItems = normalizeEvidenceActionItems(arrayFrom(root.actionItems));

  return createEnvelope("revenue_evidence", input, options, {
    score: readNumber(root.overallScore),
    confidence: readConfidence(root.confidence) ?? "partial",
    dataCompleteness: warnings.length ? "partial" : "complete",
    missingSources: warnings.map((warning) => warning.source).filter(isString)
  }, warnings, actionItems);
}

export function wrapMarketEvidence(
  input: unknown,
  options: EvidenceWrapOptions
): EbosEvidenceEnvelope<unknown> {
  const root = asRecord(input);
  const warnings = normalizeEvidenceWarnings(arrayFrom(root.warnings));
  const actionItems = normalizeEvidenceActionItems(arrayFrom(root.actionItems));

  return createEnvelope("market_evidence", input, options, {
    score: readNumber(root.overallScore),
    confidence: readConfidence(root.confidence) ?? "partial",
    dataCompleteness: warnings.length ? "partial" : "complete",
    missingSources: warnings.map((warning) => warning.source).filter(isString)
  }, warnings, actionItems);
}

export function wrapCompetitorEvidence(
  input: unknown,
  options: EvidenceWrapOptions
): EbosEvidenceEnvelope<unknown> {
  const root = asRecord(input);
  const warnings = normalizeEvidenceWarnings(arrayFrom(root.warnings));
  const actionItems = normalizeEvidenceActionItems(arrayFrom(root.actionItems));

  return createEnvelope("competitor_evidence", input, options, {
    score: readNumber(root.overallScore),
    confidence: readConfidence(root.confidence) ?? "partial",
    dataCompleteness: warnings.length ? "partial" : "complete",
    missingSources: warnings.map((warning) => warning.source).filter(isString)
  }, warnings, actionItems);
}

export function normalizeEvidenceWarnings(warnings: unknown[]): EbosEvidenceWarning[] {
  return warnings
    .map((warning, index): EbosEvidenceWarning | null => {
      const record = asRecord(warning);
      if (!record) return null;
      const message = readString(record.message) ?? readString(record.summary);
      if (!message) return null;

      return {
        code: readString(record.code) ?? `warning_${index + 1}`,
        severity: readEvidenceSeverity(record.severity),
        message,
        source: readString(record.source) ?? readString(record.section),
        recommendation: readString(record.recommendation)
      };
    })
    .filter((warning): warning is EbosEvidenceWarning => warning !== null);
}

export function normalizeEvidenceActionItems(actionItems: unknown[]): EbosEvidenceActionItem[] {
  return actionItems
    .map((item, index): EbosEvidenceActionItem | null => {
      const record = asRecord(item);
      if (!record) return null;
      const title = readString(record.title);
      if (!title) return null;

      return {
        id: readString(record.id) ?? `action-${index + 1}`,
        title,
        description: readString(record.description) ?? readString(record.verification) ?? "",
        priority: readEvidencePriority(record.priority),
        owner: readOwner(record.owner) ?? "codex",
        relatedSection: readString(record.relatedSection) ?? readString(record.sectionKey),
        evidenceRefs: arrayFrom(record.evidenceRefs).filter(isString),
        status: readEvidenceActionStatus(record.status)
      };
    })
    .filter((item): item is EbosEvidenceActionItem => item !== null);
}

function createEnvelope(
  kind: EbosEvidenceKind,
  payload: unknown,
  options: EvidenceWrapOptions,
  qualityInput: NormalizedQualityInput,
  warnings: EbosEvidenceWarning[],
  actionItems: EbosEvidenceActionItem[]
): EbosEvidenceEnvelope<unknown> {
  return {
    meta: {
      contractVersion: EBOS_EVIDENCE_CONTRACT_VERSION,
      evidenceKind: kind,
      generatedAt: formatDateTime(options.generatedAt ?? new Date()),
      targetDate: formatDateKey(options.targetDate ?? options.generatedAt ?? new Date()),
      periodStart: formatOptionalDateKey(options.periodStart),
      periodEnd: formatOptionalDateKey(options.periodEnd),
      siteUrl: options.siteUrl,
      environment: options.environment ?? "unknown",
      generator: options.generator,
      sourceFiles: options.sourceFiles,
      schemaNotes: options.schemaNotes
    },
    quality: {
      score: qualityInput.score,
      grade: qualityInput.grade,
      confidence: qualityInput.confidence ?? "unknown",
      dataCompleteness: qualityInput.dataCompleteness ?? "unknown",
      warningsCount: warnings.length,
      errorsCount: warnings.filter((warning) => warning.severity === "critical").length,
      missingSources: qualityInput.missingSources?.length ? unique(qualityInput.missingSources) : undefined
    },
    payload,
    warnings,
    actionItems
  };
}

function buildHealthCommandWarnings(commands: unknown) {
  return arrayFrom(commands)
    .map(asRecord)
    .filter((command): command is Record<string, unknown> => Boolean(command))
    .filter((command) => command.status !== "passed")
    .map((command) => ({
      code: "partial_data",
      severity: command.status === "failed" ? "critical" : "warning",
      message: readString(command.summary) ?? `${String(command.key)} is ${String(command.status)}.`,
      source: readString(command.key)
    }));
}

function buildHealthMissingSources(commands: unknown) {
  return arrayFrom(commands)
    .map(asRecord)
    .filter((command): command is Record<string, unknown> => Boolean(command))
    .filter((command) => ["skipped", "unknown", "failed"].includes(String(command.status)))
    .map((command) => readString(command.key))
    .filter(isString);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function recordOrNull(value: unknown): Record<string, unknown> | null {
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

function readConfidence(value: unknown): EbosConfidenceLevel | undefined {
  return ["unknown", "unavailable", "partial", "complete"].includes(String(value))
    ? value as EbosConfidenceLevel
    : undefined;
}

function readGrade(value: unknown): EbosScoreGrade | undefined {
  return ["excellent", "good", "warning", "critical", "unknown"].includes(String(value))
    ? value as EbosScoreGrade
    : undefined;
}

function readEvidenceSeverity(value: unknown): EbosEvidenceWarning["severity"] {
  if (value === "critical") return "critical";
  if (value === "info") return "info";
  return "warning";
}

function readEvidencePriority(value: unknown): EbosEvidenceActionItem["priority"] {
  if (value === "critical") return "critical";
  if (value === "high") return "high";
  if (value === "low") return "low";
  return "medium";
}

function readEvidenceActionStatus(value: unknown): EbosEvidenceActionItem["status"] {
  if (value === "in_progress") return "in_progress";
  if (value === "done") return "done";
  if (value === "skipped" || value === "dismissed") return "skipped";
  return "open";
}

function readOwner(value: unknown): EbosEvidenceActionItem["owner"] | undefined {
  if (value === "human" || value === "codex" || value === "system" || value === "unknown") {
    return value;
  }
  return undefined;
}

function formatDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function formatDateKey(value: string | Date) {
  if (typeof value === "string") {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }

  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatOptionalDateKey(value: string | Date | undefined) {
  return value ? formatDateKey(value) : undefined;
}

function readDateKey(value: unknown) {
  if (typeof value !== "string" && !(value instanceof Date)) return undefined;
  return formatDateKey(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

export type { EbosActionItem, EbosWarning };
