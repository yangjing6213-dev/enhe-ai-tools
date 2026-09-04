import type { EbosEvidenceActionItem, EbosEvidenceWarning } from "../evidence";
import type { EbosSeoFetcher, EbosSeoPageType } from "../seo";
import type { EbosConfidenceLevel } from "../types";

export type EbosGeoPageAudit = {
  url: string;
  path: string;
  pageType: EbosSeoPageType;
  title?: string;
  h1?: string;
  hasClearEntity: boolean;
  detectedEntities: string[];
  hasSummarySection: boolean;
  hasFaqSection: boolean;
  hasHowToSection: boolean;
  hasComparisonSection: boolean;
  hasPricingOrPurchaseSection: boolean;
  hasAuthorOrBrandSignal: boolean;
  hasDateSignal: boolean;
  hasEvidenceOrSourceLinks: boolean;
  hasStructuredData: boolean;
  answerabilityScore: number;
  citationReadinessScore: number;
  score: number;
  confidence: EbosConfidenceLevel;
  findings: string[];
  risks: string[];
  opportunities: string[];
  warnings: EbosEvidenceWarning[];
};

export type EbosGeoEvidence = {
  evidenceType: "geo_evidence";
  targetDate: string;
  siteUrl: string;
  generatedAt: string;
  pagesAudited: number;
  overallScore: number;
  confidence: EbosConfidenceLevel;
  entityFindings: string[];
  answerabilityFindings: string[];
  citationReadinessFindings: string[];
  contentStructureFindings: string[];
  risks: string[];
  opportunities: string[];
  actionItems: EbosEvidenceActionItem[];
  warnings: EbosEvidenceWarning[];
  pageAudits: EbosGeoPageAudit[];
};

export type EbosGeoFetcher = EbosSeoFetcher;
