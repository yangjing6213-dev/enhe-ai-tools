import type {
  EbosEvidenceActionItem,
  EbosEvidenceWarning
} from "../evidence";
import type { EbosConfidenceLevel } from "../types";

export type EbosCompetitorCategory =
  | "ai_tool_directory"
  | "digital_product_marketplace"
  | "technical_workflow_reference"
  | "other";

export type EbosCompetitorPriority = "low" | "medium" | "high";

export type EbosCompetitorSeedSource =
  | "manual"
  | "market_evidence"
  | "user_input"
  | "other";

export type EbosCompetitorPageType =
  | "homepage"
  | "product_listing"
  | "product_detail"
  | "pricing"
  | "blog"
  | "docs"
  | "other";

export type EbosCompetitorProductType =
  | "AI Agent"
  | "AI Video"
  | "AI Voice"
  | "Prompt Kit"
  | "Workflow Pack"
  | "Template Pack"
  | "Local AI Tool"
  | "SEO Tool"
  | "GEO Tool"
  | "Marketplace Listing"
  | "Tutorial Pack"
  | "ComfyUI Workflow";

export type EbosCompetitorOpportunityType =
  | "product_gap"
  | "pricing_gap"
  | "content_gap"
  | "seo_gap"
  | "geo_gap"
  | "distribution_gap"
  | "trust_gap";

export type EbosCompetitorRecommendedAction =
  | "build_now"
  | "validate_first"
  | "create_content_first"
  | "improve_existing_product"
  | "watch"
  | "ignore";

export type EbosCompetitorSeed = {
  id: string;
  name: string;
  url: string;
  category: EbosCompetitorCategory;
  notes?: string;
  priority: EbosCompetitorPriority;
  source: EbosCompetitorSeedSource;
  recommendedAuditPaths?: string[];
};

export type EbosCompetitorPageSignals = {
  path: string;
  pageType: EbosCompetitorPageType;
  title?: string;
  metaDescription?: string;
  h1?: string;
  hasPricingSignal: boolean;
  hasProductListingSignal: boolean;
  hasProductDetailSignal: boolean;
  hasFaqSignal: boolean;
  hasUseCaseSignal: boolean;
  hasComparisonSignal: boolean;
  hasVideoOrMediaSignal: boolean;
  hasNewsletterOrLeadMagnet: boolean;
  hasMarketplaceSignal: boolean;
  hasAffiliateSignal: boolean;
  hasStrongCTA: boolean;
  detectedProductTypes: EbosCompetitorProductType[];
  detectedPositioning: string[];
  detectedPricingTerms: string[];
  detectedSeoSignals: string[];
  detectedGeoSignals: string[];
};

export type EbosCompetitorPageAudit = EbosCompetitorPageSignals & {
  competitorId: string;
  competitorName: string;
  url: string;
  httpStatus?: number;
  score: number;
  confidence: EbosConfidenceLevel;
  findings: string[];
  risks: string[];
  opportunities: string[];
  warnings: EbosEvidenceWarning[];
};

export type EbosCompetitorAudit = {
  competitorId: string;
  name: string;
  url: string;
  category: EbosCompetitorCategory;
  pagesAudited: number;
  averageScore: number;
  positioningSummary: string;
  productTypes: EbosCompetitorProductType[];
  pricingSignals: string[];
  seoStrengths: string[];
  geoStrengths: string[];
  funnelSignals: string[];
  observedAdvantages: string[];
  observedWeaknesses: string[];
  enheDifferentiationAngles: string[];
  warnings: EbosEvidenceWarning[];
};

export type EbosCompetitorOpportunity = {
  id: string;
  title: string;
  description: string;
  relatedCompetitors: string[];
  relatedMarketDirections: string[];
  opportunityType: EbosCompetitorOpportunityType;
  priorityScore: number;
  enheFitScore: number;
  difficultyScore: number;
  riskScore: number;
  recommendedAction: EbosCompetitorRecommendedAction;
  suggestedCodexTasks: string[];
  risks: string[];
};

export type EbosCompetitorSummary = {
  competitorsCount: number;
  competitorsAuditedCount: number;
  pagesAuditedCount: number;
  averageCompetitorPageScore: number;
};

export type EbosCompetitorDataSourceSummary = {
  seedSources: string[];
  defaultSeedsCount: number;
  manualSeedsCount: number;
  networkSourcesEnabled: boolean;
  pagesAttempted: number;
  pagesSucceeded: number;
  pagesFailed: number;
  warnings: string[];
};

export type EbosCompetitorEvidence = {
  evidenceType: "competitor_evidence";
  targetDate: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  overallScore: number;
  confidence: EbosConfidenceLevel;
  competitorSummary: EbosCompetitorSummary;
  competitorAudits: EbosCompetitorAudit[];
  categoryInsights: string[];
  pricingInsights: string[];
  seoInsights: string[];
  geoInsights: string[];
  productGapInsights: string[];
  differentiationOpportunities: EbosCompetitorOpportunity[];
  risks: string[];
  opportunities: string[];
  actionItems: EbosEvidenceActionItem[];
  warnings: EbosEvidenceWarning[];
  dataSourceSummary: EbosCompetitorDataSourceSummary;
};

export type EbosCompetitorManualInput = {
  seeds?: EbosCompetitorSeed[];
  notes?: string[];
};

export type EbosCompetitorFetchResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
};

export type LoadCompetitorManualInputOptions = {
  input?: EbosCompetitorManualInput;
  filePath?: string;
};

export type BuildCompetitorEvidenceOptions = {
  targetDate?: string | Date;
  generatedAt?: string | Date;
  periodStart?: string | Date;
  periodEnd?: string | Date;
  manualInput?: EbosCompetitorManualInput;
  manualInputPath?: string;
  catalogPath?: string;
  includeNetworkSources?: boolean;
  fetcher?: (url: string) => Promise<EbosCompetitorFetchResponse>;
  maxCompetitors?: number;
  maxPagesPerCompetitor?: number;
  maxTotalUrls?: number;
  requestTimeoutMs?: number;
};

export type AuditCompetitorPageInput = {
  competitorId: string;
  competitorName: string;
  url: string;
  html?: string;
  httpStatus?: number;
};

export type CompetitorSiteAuditOptions = {
  seeds: EbosCompetitorSeed[];
  includeNetworkSources?: boolean;
  fetcher?: (url: string) => Promise<EbosCompetitorFetchResponse>;
  maxCompetitors?: number;
  maxPagesPerCompetitor?: number;
  maxTotalUrls?: number;
  requestTimeoutMs?: number;
};

export type CompetitorSiteAuditResult = {
  competitorAudits: EbosCompetitorAudit[];
  pageAudits: EbosCompetitorPageAudit[];
  warnings: EbosEvidenceWarning[];
  pagesAttempted: number;
  pagesSucceeded: number;
  pagesFailed: number;
  competitorsAuditedCount: number;
};

export type ScoreCompetitorOpportunitiesOptions = {
  competitorAudits: EbosCompetitorAudit[];
  marketEvidence?: unknown;
  productEvidence?: unknown;
  revenueEvidence?: unknown;
  seoEvidence?: unknown;
  geoEvidence?: unknown;
};
