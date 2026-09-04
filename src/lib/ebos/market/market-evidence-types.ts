import type {
  EbosEvidenceActionItem,
  EbosEvidenceWarning
} from "../evidence";
import type { EbosConfidenceLevel } from "../types";

export type EbosMarketSignalSourceType =
  | "manual"
  | "rss"
  | "github"
  | "reddit"
  | "product_hunt"
  | "hacker_news"
  | "youtube"
  | "search_trend"
  | "other";

export type EbosMarketTopic =
  | "ai_agent"
  | "ai_video"
  | "ai_voice"
  | "local_ai"
  | "seo_geo"
  | "automation"
  | "browser_agent"
  | "mcp"
  | "comfyui"
  | "prompt_kit"
  | "workflow"
  | "ecommerce"
  | "digital_product";

export type EbosMarketProductType =
  | "software_tool"
  | "prompt_kit"
  | "workflow_pack"
  | "tutorial_pack"
  | "template_pack"
  | "local_ai_bundle"
  | "whop_listing"
  | "seo_geo_content_cluster";

export type EbosMarketUserProblem =
  | "save_time"
  | "reduce_cost"
  | "deployment_gap"
  | "template_gap"
  | "prompt_gap"
  | "local_offline_need"
  | "batch_processing"
  | "monetization_need"
  | "cross_platform_publishing"
  | "content_growth";

export type EbosMarketSignal = {
  id: string;
  source: string;
  sourceType: EbosMarketSignalSourceType;
  title: string;
  description?: string;
  url?: string;
  publishedAt?: string;
  tags: string[];
  detectedTopics: EbosMarketTopic[];
  detectedProductTypes: EbosMarketProductType[];
  detectedUserProblems: EbosMarketUserProblem[];
  relevanceScore: number;
  freshnessScore: number;
  monetizationScore: number;
  confidence: EbosConfidenceLevel;
  rawText?: string;
};

export type EbosMarketOpportunityRecommendedAction =
  | "build_now"
  | "validate_first"
  | "create_content_first"
  | "watch"
  | "ignore";

export type EbosMarketOpportunityScore = {
  id: string;
  productDirection: string;
  description: string;
  targetUser: string;
  userProblem: string;
  evidenceSignalIds: string[];
  demandScore: number;
  competitionRisk: number;
  buildDifficulty: number;
  monetizationPotential: number;
  seoPotential: number;
  geoPotential: number;
  enheFitScore: number;
  priorityScore: number;
  recommendedAction: EbosMarketOpportunityRecommendedAction;
  suggestedProductFormats: string[];
  suggestedPriceRange: string;
  risks: string[];
  nextActions: string[];
};

export type EbosMarketDataSourceSummary = {
  manualSignalsCount: number;
  rssSignalsCount: number;
  githubSignalsCount: number;
  redditSignalsCount: number;
  productHuntSignalsCount: number;
  unavailableSources: string[];
  configuredSources: string[];
  warnings: string[];
};

export type EbosMarketSummary = {
  topTopics: Array<{ topic: EbosMarketTopic; count: number }>;
  topUserProblems: Array<{ problem: EbosMarketUserProblem; count: number }>;
  topProductTypes: Array<{ productType: EbosMarketProductType; count: number }>;
};

export type EbosMarketSignalSummary = {
  totalSignals: number;
  manualSignals: number;
  rssSignals: number;
  networkSignals: number;
  averageRelevanceScore: number;
  averageMonetizationScore: number;
};

export type EbosMarketOpportunitySummary = {
  totalOpportunities: number;
  buildNowCount: number;
  validateFirstCount: number;
  createContentFirstCount: number;
  watchCount: number;
  ignoreCount: number;
  highestPriorityScore: number;
};

export type EbosMarketEvidence = {
  evidenceType: "market_evidence";
  targetDate: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  overallScore: number;
  confidence: EbosConfidenceLevel;
  marketSummary: EbosMarketSummary;
  signalSummary: EbosMarketSignalSummary;
  opportunitySummary: EbosMarketOpportunitySummary;
  recommendedProductDirections: EbosMarketOpportunityScore[];
  risks: string[];
  opportunities: string[];
  actionItems: EbosEvidenceActionItem[];
  warnings: EbosEvidenceWarning[];
  signals: EbosMarketSignal[];
  opportunityScores: EbosMarketOpportunityScore[];
  dataSourceSummary: EbosMarketDataSourceSummary;
  manualInputSummary?: {
    observationTopics: string[];
    notes: string[];
  };
};

export type EbosMarketManualSignalInput = {
  title: string;
  description?: string;
  tags?: string[];
  url?: string;
};

export type EbosMarketManualInput = {
  observationTopics: string[];
  signals?: EbosMarketManualSignalInput[];
  notes?: string[];
};

export type EbosMarketRssSource = {
  url: string;
  label: string;
};

export type EbosMarketFetchResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
};

export type BuildMarketEvidenceOptions = {
  targetDate?: string | Date;
  generatedAt?: string | Date;
  periodStart?: string | Date;
  periodEnd?: string | Date;
  manualInput?: EbosMarketManualInput;
  manualInputPath?: string;
  catalogPath?: string;
  includeNetworkSources?: boolean;
  env?: Record<string, string | undefined>;
  fetcher?: (url: string) => Promise<EbosMarketFetchResponse>;
};

export type MarketOpportunityScoringOptions = {
  firstRevenueAchieved?: boolean;
  boostTopics?: EbosMarketTopic[];
  preferLowCostValidation?: boolean;
  seoEvidenceStrong?: boolean;
  geoEvidenceStrong?: boolean;
};
