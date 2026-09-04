import {
  EBOS_EVIDENCE_KINDS,
  type EbosEvidenceKind
} from "./evidence-contract";
import type {
  EbosEvidenceCatalogEntry,
  EbosEvidenceCatalogSummary
} from "./evidence-catalog-types";

export const DEFAULT_EXPECTED_EVIDENCE_KINDS: EbosEvidenceKind[] = [
  ...EBOS_EVIDENCE_KINDS
];

export function summarizeEvidenceCatalog(
  entries: EbosEvidenceCatalogEntry[],
  expectedKinds: readonly string[] = DEFAULT_EXPECTED_EVIDENCE_KINDS
): EbosEvidenceCatalogSummary {
  return {
    byKind: countBy(entries, (entry) => entry.evidenceKind),
    byConfidence: countBy(entries, (entry) => entry.confidence),
    byValidationStatus: countBy(entries, (entry) => entry.validationStatus),
    latestByKind: getLatestEntriesByKind(entries),
    missingKinds: findMissingEvidenceKinds(entries, expectedKinds),
    averageScore: calculateAverageEvidenceScore(entries),
    criticalWarningsCount: countCriticalWarnings(entries),
    openActionItemsCount: countOpenActionItems(entries),
    dateRange: getDateRange(entries)
  };
}

export function calculateAverageEvidenceScore(entries: EbosEvidenceCatalogEntry[]) {
  const scores = entries
    .map((entry) => entry.score)
    .filter((score): score is number => typeof score === "number" && Number.isFinite(score));

  if (scores.length === 0) return null;

  return Number((scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(2));
}

export function countCriticalWarnings(entries: EbosEvidenceCatalogEntry[]) {
  return entries.reduce((total, entry) => {
    if (entry.warnings?.length) {
      return total + entry.warnings.filter((warning) => warning.severity === "critical").length;
    }

    return total + entry.errorsCount;
  }, 0);
}

export function countOpenActionItems(entries: EbosEvidenceCatalogEntry[]) {
  return entries.reduce((total, entry) => {
    if (entry.actionItems?.length) {
      return total + entry.actionItems.filter((item) => item.status === "open" || item.status === "in_progress").length;
    }

    return total + entry.actionItemsCount;
  }, 0);
}

export function findMissingEvidenceKinds(
  entries: EbosEvidenceCatalogEntry[],
  expectedKinds: readonly string[] = DEFAULT_EXPECTED_EVIDENCE_KINDS
) {
  const present = new Set(entries.map((entry) => entry.evidenceKind));
  return expectedKinds.filter((kind) => !present.has(kind as EbosEvidenceKind));
}

export function getLatestEntriesByKind(entries: EbosEvidenceCatalogEntry[]) {
  const latest: Record<string, EbosEvidenceCatalogEntry> = {};

  for (const entry of stableSortEntries(entries)) {
    latest[entry.evidenceKind] ??= entry;
  }

  return latest;
}

export function stableSortEntries(entries: EbosEvidenceCatalogEntry[]) {
  return [...entries].sort((a, b) => {
    const generated = b.generatedAt.localeCompare(a.generatedAt);
    if (generated !== 0) return generated;

    const target = b.targetDate.localeCompare(a.targetDate);
    if (target !== 0) return target;

    return a.filePath.localeCompare(b.filePath);
  });
}

function countBy(
  entries: EbosEvidenceCatalogEntry[],
  readKey: (entry: EbosEvidenceCatalogEntry) => string
) {
  return entries.reduce<Record<string, number>>((counts, entry) => {
    const key = readKey(entry);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function getDateRange(entries: EbosEvidenceCatalogEntry[]): EbosEvidenceCatalogSummary["dateRange"] {
  const dates = entries
    .map((entry) => entry.targetDate)
    .filter(Boolean)
    .sort();

  if (dates.length === 0) return null;

  return {
    start: dates[0]!,
    end: dates[dates.length - 1]!
  };
}
