import type { EbosConfidenceLevel } from "../types";
import {
  EBOS_EVIDENCE_KINDS,
  type EbosEvidenceMeta,
  type EbosEvidenceQuality
} from "./evidence-contract";
import { isSupportedEvidenceContractVersion } from "./evidence-contract-version";

export type EbosEvidenceValidationIssue = {
  path: string;
  code: string;
  message: string;
  severity: "warning" | "critical";
};

export type EbosEvidenceValidationResult = {
  valid: boolean;
  issues: EbosEvidenceValidationIssue[];
};

const CONFIDENCE_LEVELS: EbosConfidenceLevel[] = [
  "unknown",
  "unavailable",
  "partial",
  "complete"
];

export function validateEvidenceEnvelope(input: unknown): EbosEvidenceValidationResult {
  const issues = collectEvidenceValidationIssues(input);
  return {
    valid: issues.length === 0,
    issues
  };
}

export function collectEvidenceValidationIssues(input: unknown): EbosEvidenceValidationIssue[] {
  const issues: EbosEvidenceValidationIssue[] = [];

  if (!isRecord(input)) {
    issues.push(issue("envelope", "invalid_type", "Evidence envelope must be an object."));
    return issues;
  }

  issues.push(...validateEvidenceMeta(input.meta));
  issues.push(...validateEvidenceQuality(input.quality));

  if (!Array.isArray(input.warnings)) {
    issues.push(issue("warnings", "invalid_type", "warnings must be an array."));
  }

  if (!Array.isArray(input.actionItems)) {
    issues.push(issue("actionItems", "invalid_type", "actionItems must be an array."));
  }

  if (!("payload" in input) || input.payload === undefined || input.payload === null) {
    issues.push(issue("payload", "missing", "payload must exist."));
  }

  return issues;
}

export function validateEvidenceMeta(meta: unknown): EbosEvidenceValidationIssue[] {
  const issues: EbosEvidenceValidationIssue[] = [];

  if (!isRecord(meta)) {
    return [issue("meta", "missing", "meta must be an object.")];
  }

  if (!("contractVersion" in meta)) {
    issues.push(issue("meta.contractVersion", "missing", "meta.contractVersion is required."));
  } else if (!isSupportedEvidenceContractVersion(meta.contractVersion)) {
    issues.push(issue("meta.contractVersion", "unsupported", "meta.contractVersion is not supported."));
  }

  if (!EBOS_EVIDENCE_KINDS.includes(meta.evidenceKind as never)) {
    issues.push(issue("meta.evidenceKind", "invalid", "meta.evidenceKind is not supported."));
  }

  if (!isParseableDate(meta.generatedAt)) {
    issues.push(issue("meta.generatedAt", "invalid", "meta.generatedAt must be a parseable date."));
  }

  if (!isParseableDate(meta.targetDate)) {
    issues.push(issue("meta.targetDate", "invalid", "meta.targetDate must be YYYY-MM-DD or a parseable ISO date."));
  }

  if (typeof meta.generator !== "string" || !meta.generator.trim()) {
    issues.push(issue("meta.generator", "missing", "meta.generator is required."));
  }

  return issues;
}

export function validateEvidenceQuality(quality: unknown): EbosEvidenceValidationIssue[] {
  const issues: EbosEvidenceValidationIssue[] = [];

  if (!isRecord(quality)) {
    return [issue("quality", "missing", "quality must be an object.")];
  }

  if (!isConfidence(quality.confidence)) {
    issues.push(issue("quality.confidence", "invalid", "quality.confidence is not a supported EBOS confidence level."));
  }

  if (!isConfidence(quality.dataCompleteness)) {
    issues.push(issue("quality.dataCompleteness", "invalid", "quality.dataCompleteness is not a supported EBOS confidence level."));
  }

  if (quality.score !== undefined && quality.score !== null) {
    if (typeof quality.score !== "number" || !Number.isFinite(quality.score) || quality.score < 0 || quality.score > 100) {
      issues.push(issue("quality.score", "invalid", "quality.score must be between 0 and 100 when present."));
    }
  }

  if (!isNonNegativeInteger(quality.warningsCount)) {
    issues.push(issue("quality.warningsCount", "invalid", "quality.warningsCount must be a non-negative integer."));
  }

  if (!isNonNegativeInteger(quality.errorsCount)) {
    issues.push(issue("quality.errorsCount", "invalid", "quality.errorsCount must be a non-negative integer."));
  }

  return issues;
}

function issue(path: string, code: string, message: string): EbosEvidenceValidationIssue {
  return {
    path,
    code,
    message,
    severity: "warning"
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isParseableDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function isConfidence(value: unknown): value is EbosConfidenceLevel {
  return CONFIDENCE_LEVELS.includes(value as EbosConfidenceLevel);
}

function isNonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export type { EbosEvidenceMeta, EbosEvidenceQuality };
