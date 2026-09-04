import type { EbosEvidenceActionItem, EbosEvidenceWarning } from "../evidence";
import type { EbosConfidenceLevel } from "../types";

export type EbosSeoPageType =
  | "homepage"
  | "software_listing"
  | "software_detail"
  | "ai_news"
  | "ai_trends"
  | "account_services"
  | "skill_learning"
  | "other";

export type EbosSeoPageAudit = {
  url: string;
  path: string;
  pageType: EbosSeoPageType;
  httpStatus?: number;
  title?: string;
  metaDescription?: string;
  h1?: string;
  h2Count: number;
  canonical?: string;
  robotsMeta?: string;
  hasStructuredData: boolean;
  structuredDataTypes: string[];
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  hasFaqSignals: boolean;
  hasProductSignals: boolean;
  hasBreadcrumbSignals: boolean;
  internalLinksCount: number;
  externalLinksCount: number;
  imagesWithoutAltCount: number;
  wordCountEstimate: number;
  score: number;
  confidence: EbosConfidenceLevel;
  findings: string[];
  risks: string[];
  opportunities: string[];
  warnings: EbosEvidenceWarning[];
};

export type EbosSeoSiteSummary = {
  totalPagesAudited: number;
  passedPages: number;
  warningPages: number;
  criticalPages: number;
  averageScore: number;
  missingTitleCount: number;
  missingDescriptionCount: number;
  missingH1Count: number;
  missingCanonicalCount: number;
  missingStructuredDataCount: number;
  pagesWithFaqSignals: number;
  pagesWithProductSignals: number;
};

export type EbosSeoEvidence = {
  evidenceType: "seo_evidence";
  targetDate: string;
  siteUrl: string;
  generatedAt: string;
  pagesAudited: number;
  sitemapStatus: "available" | "fallback" | "unavailable";
  robotsStatus: "available" | "unavailable";
  overallScore: number;
  confidence: EbosConfidenceLevel;
  technicalFindings: string[];
  contentFindings: string[];
  structuredDataFindings: string[];
  indexabilityFindings: string[];
  internalLinkFindings: string[];
  risks: string[];
  opportunities: string[];
  actionItems: EbosEvidenceActionItem[];
  warnings: EbosEvidenceWarning[];
  pageAudits: EbosSeoPageAudit[];
  summary: EbosSeoSiteSummary;
};

export type EbosSeoFetchResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
};

export type EbosSeoFetcher = (url: string) => Promise<EbosSeoFetchResponse>;
