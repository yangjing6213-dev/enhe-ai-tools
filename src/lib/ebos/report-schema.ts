import {
  DEFAULT_EBOS_SECTION_KEYS,
  DEFAULT_EBOS_SECTION_WEIGHTS,
  EBOS_SECTION_TITLES,
  EBOS_VERSION
} from "./constants";
import { getMonthlyWindow, getWeeklyWindow } from "./date-window";
import { normalizeScore } from "./score";
import type {
  EbosReport,
  EbosReportSection,
  EbosReportType,
  EbosReportValidationResult,
  EbosSectionKey
} from "./types";

const requiredSectionArrayFields = [
  "findings",
  "risks",
  "opportunities",
  "actionItems",
  "warnings"
] as const;

export function createEmptySection(sectionKey: EbosSectionKey): EbosReportSection {
  return {
    key: sectionKey,
    title: EBOS_SECTION_TITLES[sectionKey],
    score: null,
    grade: "unknown",
    confidence: "unknown",
    findings: [],
    risks: [],
    opportunities: [],
    actionItems: [],
    warnings: [],
    dataSources: [],
    weight: DEFAULT_EBOS_SECTION_WEIGHTS[sectionKey]
  };
}

export function createEmptyEbosReport(type: EbosReportType, date: Date): EbosReport {
  return {
    version: EBOS_VERSION,
    type,
    period: type === "weekly" ? getWeeklyWindow(date) : getMonthlyWindow(date),
    generatedAt: new Date(date.getTime()),
    overallScore: null,
    confidence: "unknown",
    sections: DEFAULT_EBOS_SECTION_KEYS.map((sectionKey) => createEmptySection(sectionKey)),
    warnings: [],
    actionItems: [],
    okrs: []
  };
}

export function validateEbosReport(report: unknown): EbosReportValidationResult {
  const errors: string[] = [];
  const candidate = report as Partial<EbosReport>;

  if (!candidate || typeof candidate !== "object") {
    return { valid: false, errors: ["report must be an object"] };
  }

  if (candidate.version !== EBOS_VERSION) {
    errors.push("version must be 1.0");
  }

  if (candidate.type !== "weekly" && candidate.type !== "monthly") {
    errors.push("type must be weekly or monthly");
  }

  if (!candidate.period || !isValidDate(candidate.period.start) || !isValidDate(candidate.period.end)) {
    errors.push("period must include valid start and end dates");
  }

  if (!Array.isArray(candidate.sections)) {
    errors.push("sections must be an array");
  } else {
    validateSections(candidate.sections, errors);
  }

  if (!Array.isArray(candidate.warnings)) {
    errors.push("warnings must be an array");
  }

  if (!Array.isArray(candidate.actionItems)) {
    errors.push("actionItems must be an array");
  }

  if (!Array.isArray(candidate.okrs)) {
    errors.push("okrs must be an array");
  }

  return { valid: errors.length === 0, errors };
}

function validateSections(sections: unknown[], errors: string[]) {
  const seenKeys = new Set<string>();

  sections.forEach((section, index) => {
    const candidate = section as Partial<EbosReportSection>;
    const prefix = `sections[${index}]`;

    if (!candidate || typeof candidate !== "object") {
      errors.push(`${prefix} must be an object`);
      return;
    }

    if (!isEbosSectionKey(candidate.key)) {
      errors.push(`${prefix}.key must be a known EBOS section key`);
    } else if (seenKeys.has(candidate.key)) {
      errors.push(`${prefix}.key must be unique`);
    } else {
      seenKeys.add(candidate.key);
    }

    for (const field of requiredSectionArrayFields) {
      if (!Array.isArray(candidate[field])) {
        errors.push(`${prefix}.${field} must be an array`);
      }
    }

    if (!Array.isArray(candidate.dataSources)) {
      errors.push(`${prefix}.dataSources must be an array`);
    }

    if (normalizeScore(candidate.score) !== candidate.score && candidate.score !== null) {
      errors.push(`${prefix}.score must be null or a score between 0 and 100`);
    }

  });

  for (const sectionKey of DEFAULT_EBOS_SECTION_KEYS) {
    if (!seenKeys.has(sectionKey)) {
      errors.push(`sections must include ${sectionKey}`);
    }
  }
}

function isEbosSectionKey(value: unknown): value is EbosSectionKey {
  return (
    typeof value === "string" &&
    DEFAULT_EBOS_SECTION_KEYS.includes(value as EbosSectionKey)
  );
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
