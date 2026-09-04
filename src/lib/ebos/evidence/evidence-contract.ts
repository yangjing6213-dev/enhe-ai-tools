import type { EbosConfidenceLevel, EbosScoreGrade } from "../types";
import { EBOS_EVIDENCE_CONTRACT_VERSION } from "./evidence-contract-version";

export const EBOS_EVIDENCE_KINDS = [
  "health_snapshot",
  "data_source_readiness",
  "weekly_report",
  "monthly_review",
  "seo_evidence",
  "geo_evidence",
  "market_evidence",
  "competitor_evidence",
  "revenue_evidence",
  "product_evidence"
] as const;

export type EbosEvidenceKind = (typeof EBOS_EVIDENCE_KINDS)[number];

export type EbosEvidenceContractVersion = typeof EBOS_EVIDENCE_CONTRACT_VERSION;

export type EbosEvidenceEnvironment =
  | "local"
  | "staging"
  | "production"
  | "unknown";

export type EbosEvidenceMeta = {
  contractVersion: EbosEvidenceContractVersion;
  evidenceKind: EbosEvidenceKind;
  generatedAt: string;
  targetDate: string;
  periodStart?: string;
  periodEnd?: string;
  siteUrl?: string;
  environment?: EbosEvidenceEnvironment;
  generator: string;
  sourceFiles?: string[];
  schemaNotes?: string[];
};

export type EbosEvidenceQuality = {
  score?: number | null;
  grade?: EbosScoreGrade;
  confidence: EbosConfidenceLevel;
  dataCompleteness: EbosConfidenceLevel;
  warningsCount: number;
  errorsCount: number;
  missingSources?: string[];
};

export type EbosEvidenceWarning = {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
  source?: string;
  recommendation?: string;
};

export type EbosEvidenceActionItem = {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  owner: "human" | "codex" | "system" | "unknown";
  relatedSection?: string;
  evidenceRefs?: string[];
  status: "open" | "in_progress" | "done" | "skipped";
};

export type EbosEvidenceEnvelope<TPayload> = {
  meta: EbosEvidenceMeta;
  quality: EbosEvidenceQuality;
  payload: TPayload;
  warnings: EbosEvidenceWarning[];
  actionItems: EbosEvidenceActionItem[];
};
