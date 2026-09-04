import type {
  EbosEvidenceActionItem,
  EbosEvidenceWarning
} from "../evidence";
import type { EbosProductDatabaseSummary } from "../product/product-evidence-types";
import type { EbosConfidenceLevel } from "../types";

export type EbosRevenueSummary = {
  grossRevenue: number;
  netRevenue: number;
  refundedAmount: number;
  paidRevenue: number;
  pendingRevenue: number;
  unpaidRevenue: number;
  averageOrderValue: number;
  revenueGrowthRate?: number;
  firstRevenueAchieved: boolean;
  firstPaidOrderDate?: string;
  lastPaidOrderDate?: string;
};

export type EbosOrderSummary = {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  unpaidOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  currentPeriodOrders: number;
  currentPeriodPaidOrders: number;
  conversionEvidenceAvailable: boolean;
  orderStatusBreakdown: Record<string, number>;
};

export type EbosRefundSummary = {
  totalRefunds: number;
  currentPeriodRefunds: number;
  refundedAmount: number;
  refundRate: number;
  refundRisks: string[];
};

export type EbosProductRevenueMetric = {
  productId?: string;
  productSlug?: string;
  productName?: string;
  ordersCount: number;
  paidOrdersCount: number;
  grossRevenue: number;
  netRevenue: number;
  refundedAmount: number;
  averageOrderValue: number;
  hasPriceConfigured?: boolean;
  hasDownloadConfigured?: boolean;
  hasFaqConfigured?: boolean;
  productPageScore?: number;
  revenueReadinessScore: number;
  findings: string[];
  risks: string[];
  opportunities: string[];
  actionItems: string[];
};

export type EbosRevenueDatabaseSummary = {
  hasOrderModel: boolean;
  hasRefundModel: boolean;
  hasPaymentModel: boolean;
  hasProductModel: boolean;
  orderFieldsDetected: string[];
  refundFieldsDetected: string[];
  productFieldsDetected: string[];
  attributionFieldsDetected: string[];
  unsupportedFields: string[];
  warnings: string[];
};

export type EbosRevenueOrderRecord = {
  id: string;
  orderNo?: string;
  toolId?: string;
  productId?: string;
  productSlug?: string;
  productName?: string;
  amount: number;
  status?: string;
  orderType?: string;
  paidAt?: string;
  createdAt?: string;
  refundedAmount?: number;
};

export type EbosRevenueRefundRecord = {
  id: string;
  orderId?: string;
  amount: number;
  status?: string;
  createdAt?: string;
  completedAt?: string;
};

export type EbosRevenueProductRecord = {
  productId?: string;
  productSlug?: string;
  productName?: string;
  hasPriceConfigured?: boolean;
  hasDownloadConfigured?: boolean;
  hasFaqConfigured?: boolean;
  productPageScore?: number;
};

export type EbosProductRevenueSummary = {
  productMetrics: EbosProductRevenueMetric[];
  unattributedRevenue: EbosProductRevenueMetric;
  recommendedValidationProducts: EbosProductRevenueMetric[];
};

export type EbosRevenueEvidence = {
  evidenceType: "revenue_evidence";
  targetDate: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  overallScore: number;
  confidence: EbosConfidenceLevel;
  currency: string;
  revenueSummary: EbosRevenueSummary;
  orderSummary: EbosOrderSummary;
  refundSummary: EbosRefundSummary;
  productRevenueSummary: EbosProductRevenueSummary;
  revenueReadinessFindings: string[];
  attributionFindings: string[];
  risks: string[];
  opportunities: string[];
  actionItems: EbosEvidenceActionItem[];
  warnings: EbosEvidenceWarning[];
  databaseSummary: EbosRevenueDatabaseSummary;
  manualRevenueSummary?: Partial<EbosRevenueSummary>;
};

export type EbosRevenueDatabaseClient = {
  order?: {
    findMany(args?: unknown): Promise<unknown[]>;
  };
  orderRefundRecord?: {
    findMany(args?: unknown): Promise<unknown[]>;
  };
  tool?: {
    findMany(args?: unknown): Promise<unknown[]>;
  };
};

export type AuditRevenueDatabaseOptions = {
  prismaClient?: EbosRevenueDatabaseClient;
  periodStart?: string | Date;
  periodEnd?: string | Date;
};

export type EbosRevenueDatabaseAuditResult = {
  currency: string;
  revenueSummary: EbosRevenueSummary;
  orderSummary: EbosOrderSummary;
  refundSummary: EbosRefundSummary;
  databaseSummary: EbosRevenueDatabaseSummary;
  orders: EbosRevenueOrderRecord[];
  refunds: EbosRevenueRefundRecord[];
  products: EbosRevenueProductRecord[];
  warnings: EbosEvidenceWarning[];
};

export type AttributeRevenueToProductsOptions = {
  orders: EbosRevenueOrderRecord[];
  refunds: EbosRevenueRefundRecord[];
  products: EbosRevenueProductRecord[];
  productEvidence?: {
    productAudits?: Array<{
      slug?: string;
      productName?: string;
      score?: number;
    }>;
    databaseSummary?: Partial<EbosProductDatabaseSummary>;
  } | null;
};

export type EbosRevenueAttributionResult = EbosProductRevenueSummary & {
  warnings: EbosEvidenceWarning[];
};

export type BuildRevenueEvidenceOptions = AuditRevenueDatabaseOptions & {
  targetDate?: string | Date;
  periodStart?: string | Date;
  periodEnd?: string | Date;
  generatedAt?: string | Date;
  catalogPath?: string;
  productEvidence?: AttributeRevenueToProductsOptions["productEvidence"];
  manualInput?: {
    revenueSummary?: Partial<EbosRevenueSummary>;
    notes?: string[];
  };
};
