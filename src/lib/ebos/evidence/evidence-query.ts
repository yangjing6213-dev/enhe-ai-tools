import type {
  EbosEvidenceCatalog,
  EbosEvidenceCatalogEntry,
  EbosEvidenceQueryOptions
} from "./evidence-catalog-types";

export type EbosEvidenceWarningQueryResult = NonNullable<EbosEvidenceCatalogEntry["warnings"]>[number] & {
  entryId: string;
  evidenceKind: string;
  targetDate: string;
  filePath: string;
};

export type EbosEvidenceActionItemQueryResult = NonNullable<EbosEvidenceCatalogEntry["actionItems"]>[number] & {
  entryId: string;
  evidenceKind: string;
  targetDate: string;
  filePath: string;
};

export function queryEvidenceCatalog(
  catalog: EbosEvidenceCatalog,
  options: EbosEvidenceQueryOptions = {}
) {
  const filtered = catalog.entries.filter((entry) => {
    if (options.kind && entry.evidenceKind !== options.kind) return false;
    if (options.targetDate && entry.targetDate !== options.targetDate) return false;
    if (options.dateFrom && entry.targetDate < options.dateFrom) return false;
    if (options.dateTo && entry.targetDate > options.dateTo) return false;
    if (options.confidence && entry.confidence !== options.confidence) return false;
    if (options.validationStatus && entry.validationStatus !== options.validationStatus) return false;
    if (typeof options.minScore === "number" && ((entry.score ?? -Infinity) < options.minScore)) return false;
    return true;
  });

  const sorted = sortEntries(filtered, options);
  return typeof options.limit === "number" ? sorted.slice(0, options.limit) : sorted;
}

export function getLatestEvidenceByKind(
  catalog: EbosEvidenceCatalog,
  kind: EbosEvidenceCatalogEntry["evidenceKind"]
) {
  return queryEvidenceCatalog(catalog, {
    kind,
    sortBy: "generatedAt",
    sortOrder: "desc",
    limit: 1
  })[0] ?? null;
}

export function getEvidenceByDate(catalog: EbosEvidenceCatalog, targetDate: string) {
  return queryEvidenceCatalog(catalog, { targetDate });
}

export function getEvidenceForPeriod(
  catalog: EbosEvidenceCatalog,
  dateFrom: string,
  dateTo: string
) {
  return queryEvidenceCatalog(catalog, {
    dateFrom,
    dateTo,
    sortBy: "targetDate",
    sortOrder: "asc"
  });
}

export function getEvidenceActionItems(
  catalog: EbosEvidenceCatalog,
  options: EbosEvidenceQueryOptions = {}
): EbosEvidenceActionItemQueryResult[] {
  return queryEvidenceCatalog(catalog, options).flatMap((entry) => {
    return (entry.actionItems ?? []).map((item) => ({
      ...item,
      entryId: entry.id,
      evidenceKind: entry.evidenceKind,
      targetDate: entry.targetDate,
      filePath: entry.filePath
    }));
  });
}

export function getEvidenceWarnings(
  catalog: EbosEvidenceCatalog,
  options: EbosEvidenceQueryOptions = {}
): EbosEvidenceWarningQueryResult[] {
  return queryEvidenceCatalog(catalog, options).flatMap((entry) => {
    return (entry.warnings ?? []).map((warning) => ({
      ...warning,
      entryId: entry.id,
      evidenceKind: entry.evidenceKind,
      targetDate: entry.targetDate,
      filePath: entry.filePath
    }));
  });
}

function sortEntries(
  entries: EbosEvidenceCatalogEntry[],
  options: EbosEvidenceQueryOptions
) {
  const sortBy = options.sortBy ?? "generatedAt";
  const sortOrder = options.sortOrder ?? "desc";
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...entries].sort((a, b) => {
    const value = compareBy(a, b, sortBy);
    if (value !== 0) return value * direction;

    const generated = b.generatedAt.localeCompare(a.generatedAt);
    if (generated !== 0) return generated;

    return a.id.localeCompare(b.id);
  });
}

function compareBy(
  a: EbosEvidenceCatalogEntry,
  b: EbosEvidenceCatalogEntry,
  sortBy: NonNullable<EbosEvidenceQueryOptions["sortBy"]>
) {
  if (sortBy === "score") {
    return (a.score ?? -Infinity) - (b.score ?? -Infinity);
  }

  return a[sortBy].localeCompare(b[sortBy]);
}
