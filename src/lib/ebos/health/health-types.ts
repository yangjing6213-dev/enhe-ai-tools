import type { EbosConfidenceLevel, EbosScoreGrade } from "../types";
import type { ProductPageUrlSource } from "./product-page-url-source";

export type EbosCommandHealthStatus =
  | "passed"
  | "failed"
  | "skipped"
  | "unknown";

export type EbosWebsiteHealthCheckKey =
  | "lint"
  | "typecheck"
  | "build"
  | "ebos_tests"
  | "unit_tests"
  | "playwright_smoke"
  | "lighthouse"
  | "sitemap"
  | "robots"
  | "homepage"
  | "key_product_pages";

export type EbosCommandHealthResult = {
  key: EbosWebsiteHealthCheckKey;
  label: string;
  command: string;
  status: EbosCommandHealthStatus;
  exitCode: number | null;
  url?: string;
  httpStatus?: number | null;
  stdoutSummary: string;
  stderrSummary: string;
  durationMs: number | null;
  checkedAt: Date;
  summary: string;
  recommendation?: string;
  source?: "env" | "default" | "database" | "manual" | "input" | ProductPageUrlSource;
  sourceConfidence?: EbosConfidenceLevel;
  reason?: string;
  expectedPublic?: boolean;
  environmentMismatchRisk?: boolean;
  isProductDetailPage?: boolean;
};

export type EbosSmokeCheckResult = EbosCommandHealthResult & {
  url: string;
  httpStatus: number | null;
  recommendation: string;
};

export type EbosCommandHealthSummary = {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  unknown: number;
  failureSummary: string[];
  failedChecks: EbosCommandHealthResult[];
};

export type EbosWebsiteHealthSnapshot = {
  generatedAt: Date;
  commands: EbosCommandHealthResult[];
};

export type EbosHealthFinding = {
  message: string;
};

export type EbosHealthRisk = {
  message: string;
  severity: "info" | "warning" | "critical";
};

export type EbosHealthRecommendation = {
  message: string;
  priority: "high" | "medium" | "low";
};

export type EbosWebsiteHealthScore = {
  score: number;
  grade: EbosScoreGrade;
  confidence: EbosConfidenceLevel;
  findings: EbosHealthFinding[];
  risks: EbosHealthRisk[];
  recommendations: EbosHealthRecommendation[];
};
