import { EBOS_EVIDENCE_KINDS, type EbosEvidenceKind } from "./evidence-contract";

export type EbosParsedEvidenceFileName = {
  targetDate: string;
  kind: EbosEvidenceKind;
  ext: string;
};

const DEFAULT_EVIDENCE_ROOT = "reports/ebos/evidence";

export function createEvidenceFileName(
  kind: EbosEvidenceKind,
  targetDate: string | Date,
  ext: string
) {
  const normalizedExt = ext.replace(/^\./, "");
  return `${formatDateKey(targetDate)}-${kind}.${normalizedExt}`;
}

export function parseEvidenceFileName(filename: string): EbosParsedEvidenceFileName | null {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})-([a-z_]+)\.([a-z0-9]+)$/i);
  if (!match) return null;

  const [, targetDate, kind, ext] = match;
  if (!targetDate || !kind || !ext) return null;
  if (!EBOS_EVIDENCE_KINDS.includes(kind as EbosEvidenceKind)) return null;

  return {
    targetDate,
    kind: kind as EbosEvidenceKind,
    ext
  };
}

export function isEvidenceJsonFile(filename: string) {
  const parsed = parseEvidenceFileName(filename);
  return parsed?.ext.toLowerCase() === "json";
}

export function getEvidenceDirectory(kind: EbosEvidenceKind) {
  return `${DEFAULT_EVIDENCE_ROOT}/${kind}`;
}

function formatDateKey(value: string | Date) {
  if (typeof value === "string") {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid evidence target date: ${String(value)}`);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
