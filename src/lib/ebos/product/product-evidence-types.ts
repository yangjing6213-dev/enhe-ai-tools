import type {
  EbosEvidenceActionItem,
  EbosEvidenceWarning
} from "../evidence";
import type { ProductPageUrlProductInput, ProductPageUrlSource } from "../health";
import type { EbosConfidenceLevel } from "../types";

export type EbosProductFetchResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
};

export type EbosProductFetcher = (url: string) => Promise<EbosProductFetchResponse>;

export type EbosProductPageAudit = {
  url: string;
  path: string;
  slug?: string;
  productName?: string;
  httpStatus?: number;
  hasClearHero: boolean;
  hasProductSummary: boolean;
  hasFeatureList: boolean;
  hasUseCases: boolean;
  hasTargetAudience: boolean;
  hasPricingOrPurchaseInfo: boolean;
  hasPrimaryCTA: boolean;
  hasSecondaryCTA: boolean;
  hasBuyLink: boolean;
  hasDownloadOrDeliveryInfo: boolean;
  hasFaqSection: boolean;
  faqCount: number;
  hasMedia: boolean;
  hasVideo: boolean;
  hasProductImage: boolean;
  hasTrustSignal: boolean;
  hasRefundOrSupportInfo: boolean;
  hasComplianceNotice: boolean;
  internalLinksCount: number;
  wordCountEstimate: number;
  conversionReadinessScore: number;
  offerClarityScore: number;
  deliveryReadinessScore: number;
  score: number;
  confidence: EbosConfidenceLevel;
  findings: string[];
  risks: string[];
  opportunities: string[];
  actionItems: EbosEvidenceActionItem[];
  warnings: EbosEvidenceWarning[];
};

export type EbosProductDatabaseSummary = {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  productsWithPrice?: number;
  productsWithDownload?: number;
  productsWithFaq?: number;
  productsWithCover?: number;
  productsWithTags?: number;
  productsWithSeoFields?: number;
  productsWithGeoFields?: number;
};

export type EbosProductSiteSummary = {
  totalProductsAudited: number;
  passedProducts: number;
  warningProducts: number;
  criticalProducts: number;
  averageScore: number;
  missingSummaryCount: number;
  missingFaqCount: number;
  missingCtaCount: number;
  missingMediaCount: number;
  missingDeliveryInfoCount: number;
  missingSupportInfoCount: number;
};

export type EbosProductEvidence = {
  evidenceType: "product_evidence";
  targetDate: string;
  siteUrl: string;
  generatedAt: string;
  productsAudited: number;
  overallScore: number;
  confidence: EbosConfidenceLevel;
  productReadinessFindings: string[];
  conversionFindings: string[];
  offerFindings: string[];
  mediaFindings: string[];
  faqFindings: string[];
  purchasePathFindings: string[];
  deliveryFindings: string[];
  risks: string[];
  opportunities: string[];
  actionItems: EbosEvidenceActionItem[];
  warnings: EbosEvidenceWarning[];
  productAudits: EbosProductPageAudit[];
  siteSummary: EbosProductSiteSummary;
  databaseSummary?: EbosProductDatabaseSummary;
};

export type EbosProductDatabaseClient = {
  tool: {
    findMany(args?: unknown): Promise<unknown[]>;
  };
};

export type AuditProductDatabaseOptions = {
  prismaClient?: EbosProductDatabaseClient;
};

export type EbosProductDatabaseAuditResult = {
  databaseSummary: EbosProductDatabaseSummary;
  warnings: EbosEvidenceWarning[];
};

export type BuildProductAuditUrlListOptions = {
  siteUrl?: string;
  maxUrls?: number;
  sitemapProductLimit?: number;
  urls?: string[];
  fetcher?: EbosProductFetcher;
  internalProducts?: ProductPageUrlProductInput[];
  databaseAvailable?: boolean;
  databaseUrl?: string | null;
  manualFallbackPaths?: string[];
};

export type ProductAuditUrlListResult = {
  urls: string[];
  sitemapStatus: "available" | "fallback" | "unavailable";
  urlSource: ProductPageUrlSource;
  warnings: EbosEvidenceWarning[];
};

export type RunProductSiteAuditOptions = BuildProductAuditUrlListOptions;

export type ProductSiteAuditResult = ProductAuditUrlListResult & {
  pageAudits: EbosProductPageAudit[];
};

export type BuildProductEvidenceOptions = RunProductSiteAuditOptions & AuditProductDatabaseOptions & {
  targetDate?: string | Date;
  generatedAt?: string | Date;
};
