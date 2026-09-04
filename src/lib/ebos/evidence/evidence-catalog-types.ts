import type { EbosConfidenceLevel, EbosScoreGrade } from "../types";
import type {
  EbosEvidenceActionItem,
  EbosEvidenceKind,
  EbosEvidenceWarning
} from "./evidence-contract";
import type { EbosEvidenceValidationIssue } from "./evidence-validator";

export type EbosEvidenceValidationStatus =
  | "valid"
  | "valid_with_warnings"
  | "invalid";

export type EbosEvidencePayloadSummary = Record<string, unknown>;

export type EbosEvidenceCatalogEntry = {
  id: string;
  filePath: string;
  fileName: string;
  evidenceKind: EbosEvidenceKind;
  contractVersion: string;
  targetDate: string;
  generatedAt: string;
  periodStart?: string;
  periodEnd?: string;
  siteUrl?: string;
  environment?: string;
  generator: string;
  score?: number;
  grade?: EbosScoreGrade;
  confidence: EbosConfidenceLevel;
  dataCompleteness?: EbosConfidenceLevel;
  warningsCount: number;
  errorsCount: number;
  actionItemsCount: number;
  missingSources?: string[];
  validationStatus: EbosEvidenceValidationStatus;
  validationIssues?: EbosEvidenceValidationIssue[];
  payloadSummary?: EbosEvidencePayloadSummary;
  warnings?: EbosEvidenceWarning[];
  actionItems?: EbosEvidenceActionItem[];
};

export type EbosEvidenceCatalogSummary = {
  byKind: Record<string, number>;
  byConfidence: Record<string, number>;
  byValidationStatus: Record<string, number>;
  latestByKind: Record<string, EbosEvidenceCatalogEntry>;
  missingKinds: string[];
  averageScore: number | null;
  criticalWarningsCount: number;
  openActionItemsCount: number;
  dateRange: {
    start: string;
    end: string;
  } | null;
};

export type EbosEvidenceCatalog = {
  catalogVersion: "ebos-evidence-catalog-v1";
  generatedAt: string;
  rootDir: string;
  totalEntries: number;
  entries: EbosEvidenceCatalogEntry[];
  summary: EbosEvidenceCatalogSummary;
};

export type EbosEvidenceQueryOptions = {
  kind?: EbosEvidenceKind;
  targetDate?: string;
  dateFrom?: string;
  dateTo?: string;
  confidence?: EbosConfidenceLevel;
  minScore?: number;
  validationStatus?: EbosEvidenceValidationStatus;
  limit?: number;
  sortBy?: "generatedAt" | "targetDate" | "score";
  sortOrder?: "asc" | "desc";
};
