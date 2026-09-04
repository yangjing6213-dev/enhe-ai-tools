import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  EbosEvidenceCatalog,
  EbosEvidenceCatalogEntry,
  EbosEvidenceEnvelope,
  EbosEvidenceKind,
  EbosEvidenceWarning
} from "../evidence";
import type {
  EbosDecisionEvidenceReadResult,
  EbosDecisionReport,
  EbosEvidenceDecisionInput
} from "./decision-types";

const DEFAULT_CATALOG_PATH = "reports/ebos/evidence/catalog/latest-evidence-catalog.json";
const DECISION_EVIDENCE_KINDS = [
  "market_evidence",
  "competitor_evidence",
  "product_evidence",
  "revenue_evidence",
  "seo_evidence",
  "geo_evidence",
  "weekly_report",
  "monthly_review"
] as const satisfies EbosEvidenceKind[];

type DecisionEvidenceKind = (typeof DECISION_EVIDENCE_KINDS)[number];

export type EbosDecisionFileSystem = {
  readFile(filePath: string, encoding: "utf8"): Promise<string>;
  readdir?(directory: string): Promise<string[]>;
};

const nodeFs: EbosDecisionFileSystem = {
  readFile: async (filePath) => readFile(filePath, "utf8"),
  readdir
};

export async function readDecisionEvidence(options: {
  catalogPath?: string;
  catalog?: EbosEvidenceCatalog;
  fs?: EbosDecisionFileSystem;
} = {}): Promise<EbosDecisionEvidenceReadResult> {
  const fs = options.fs ?? nodeFs;
  const evidenceCatalogPath = options.catalogPath ?? DEFAULT_CATALOG_PATH;
  const catalog = options.catalog ?? await readCatalog(evidenceCatalogPath, fs);

  if (!catalog) {
    return {
      input: {},
      evidenceUsed: [],
      warnings: [warning("decision_catalog_unavailable", `Decision report could not read evidence catalog at ${evidenceCatalogPath}.`)],
      dataGaps: [`Missing evidence catalog: ${evidenceCatalogPath}.`],
      evidenceCatalogPath
    };
  }

  return buildDecisionInputFromCatalog(catalog, { fs, evidenceCatalogPath });
}

export async function buildDecisionInputFromCatalog(
  catalog: EbosEvidenceCatalog,
  options: {
    fs?: EbosDecisionFileSystem;
    evidenceCatalogPath?: string;
  } = {}
): Promise<EbosDecisionEvidenceReadResult> {
  const fs = options.fs ?? nodeFs;
  const input: EbosEvidenceDecisionInput = {};
  const evidenceUsed: EbosDecisionEvidenceReadResult["evidenceUsed"] = [];
  const warnings: EbosEvidenceWarning[] = [];
  const dataGaps: string[] = [];

  for (const kind of DECISION_EVIDENCE_KINDS) {
    const entry = findLatestEntry(catalog, kind);
    if (!entry) {
      dataGaps.push(`Missing ${kind} in evidence catalog.`);
      continue;
    }

    warnings.push(...entryWarnings(entry));
    const envelope = await readEnvelope(entry.filePath, fs);
    if (!envelope) {
      dataGaps.push(`Unable to read ${kind} envelope at ${entry.filePath}.`);
      warnings.push(warning("decision_evidence_unavailable", `Decision report could not read ${kind} from ${entry.filePath}.`));
      continue;
    }

    assignPayload(input, kind, envelope.payload);
    warnings.push(...(Array.isArray(envelope.warnings) ? envelope.warnings : []));
    evidenceUsed.push({
      evidenceKind: kind,
      filePath: entry.filePath,
      targetDate: entry.targetDate,
      confidence: entry.confidence,
      score: entry.score
    });
  }

  return {
    input,
    evidenceUsed,
    warnings: dedupeWarnings(warnings),
    dataGaps,
    evidenceCatalogPath: options.evidenceCatalogPath ?? DEFAULT_CATALOG_PATH
  };
}

export async function getEvidencePayloadByKind(
  catalog: EbosEvidenceCatalog,
  kind: DecisionEvidenceKind,
  options: { fs?: EbosDecisionFileSystem } = {}
) {
  const entry = findLatestEntry(catalog, kind);
  if (!entry) return null;
  const envelope = await readEnvelope(entry.filePath, options.fs ?? nodeFs);
  return envelope?.payload ?? null;
}

export async function readLatestDecisionReport(options: {
  targetDate?: string | Date;
  reportsRoot?: string;
  fs?: EbosDecisionFileSystem;
} = {}): Promise<{ filePath: string; report: EbosDecisionReport } | null> {
  const fs = options.fs ?? nodeFs;
  const decisionDir = join(options.reportsRoot ?? "reports/ebos", "decision").replace(/\\/g, "/");
  const targetDate = options.targetDate ? toDateKey(options.targetDate) : null;

  if (targetDate) {
    const exactPath = `${decisionDir}/${targetDate}-decision-report.json`;
    const exact = await readDecisionReportFile(exactPath, fs);
    if (exact) return { filePath: exactPath, report: exact };
  }

  if (!fs.readdir) return null;
  try {
    const fileName = (await fs.readdir(decisionDir))
      .filter((name) => name.endsWith("-decision-report.json"))
      .sort()
      .at(-1);
    if (!fileName) return null;
    const filePath = `${decisionDir}/${fileName}`;
    const report = await readDecisionReportFile(filePath, fs);
    return report ? { filePath, report } : null;
  } catch {
    return null;
  }
}

async function readCatalog(filePath: string, fs: EbosDecisionFileSystem) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as EbosEvidenceCatalog;
  } catch {
    return null;
  }
}

async function readEnvelope(filePath: string, fs: EbosDecisionFileSystem) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as EbosEvidenceEnvelope<unknown>;
  } catch {
    return null;
  }
}

async function readDecisionReportFile(filePath: string, fs: EbosDecisionFileSystem) {
  try {
    const report = JSON.parse(await fs.readFile(filePath, "utf8")) as EbosDecisionReport;
    return report.reportType === "decision" ? report : null;
  } catch {
    return null;
  }
}

function findLatestEntry(catalog: EbosEvidenceCatalog, kind: DecisionEvidenceKind) {
  return catalog.summary.latestByKind[kind]
    ?? catalog.entries
      .filter((entry) => entry.evidenceKind === kind)
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0]
    ?? null;
}

function assignPayload(input: EbosEvidenceDecisionInput, kind: DecisionEvidenceKind, payload: unknown) {
  if (kind === "market_evidence") input.marketEvidence = payload;
  if (kind === "competitor_evidence") input.competitorEvidence = payload;
  if (kind === "product_evidence") input.productEvidence = payload;
  if (kind === "revenue_evidence") input.revenueEvidence = payload;
  if (kind === "seo_evidence") input.seoEvidence = payload;
  if (kind === "geo_evidence") input.geoEvidence = payload;
  if (kind === "weekly_report") input.weeklyReport = payload;
  if (kind === "monthly_review") input.monthlyReview = payload;
}

function entryWarnings(entry: EbosEvidenceCatalogEntry) {
  const warnings = [...(entry.warnings ?? [])];
  if (entry.validationStatus !== "valid") {
    warnings.push(warning(
      "decision_evidence_validation_warning",
      `${entry.evidenceKind} catalog entry is ${entry.validationStatus}.`
    ));
  }
  return warnings;
}

function warning(code: string, message: string): EbosEvidenceWarning {
  return {
    code,
    severity: "warning",
    message,
    source: "market_research"
  };
}

function dedupeWarnings(warnings: EbosEvidenceWarning[]) {
  const seen = new Set<string>();
  return warnings.filter((item) => {
    const key = `${item.code}:${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
