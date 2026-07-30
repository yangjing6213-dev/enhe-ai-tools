import type { EbosValidationInputFile, EbosValidationResultInput } from "../validation";
import type { SeoAuditAnalyticsEventName } from "@/lib/analytics";

export type EbosValidationCaptureWarning = {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
  planId?: string;
  source?: string;
};

export type EbosValidationAnalyticsEvent = {
  eventName: string;
  path?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: unknown;
  createdAt?: string | Date | null;
};

export type EbosValidationAnalyticsSummary = {
  analyticsAvailable: boolean;
  eventsDetected: number;
  pageViewsDetected: number;
  ctaClicksDetected: number;
  eventsByName: Record<string, number>;
  eventsByPath: Record<string, number>;
  seoAuditFunnel?: EbosSeoAuditFunnelSummary;
  warnings: EbosValidationCaptureWarning[];
};

export type EbosSeoAuditFunnelChannel = {
  source: string;
  medium: string;
  campaign?: string;
  offerId?: string;
  landingViews: number;
  completedScans: number;
  offerClicks: number;
  ordersCreated: number;
  paymentSucceeded: number;
  reportsDelivered: number;
  refunds: number;
};

export type EbosSeoAuditFunnelSummary = {
  counts: Record<SeoAuditAnalyticsEventName, number>;
  completedScans: number;
  channels: EbosSeoAuditFunnelChannel[];
};

export type EbosValidationOrderRecord = {
  id: string;
  productSlug?: string;
  productName?: string;
  productId?: string;
  amount: number;
  status?: string;
  paidAt?: string;
  createdAt?: string;
  refundCount: number;
  pendingRefundCount?: number;
  refundedAmount: number;
  isTestData?: boolean;
  paymentSucceeded?: boolean;
  delivered?: boolean;
};

export type EbosValidationOrderProductSummary = {
  totalOrders: number;
  paidOrders: number;
  revenue: number;
  refundedAmount: number;
  refundCount: number;
  pendingRefundOrders?: number;
  undeliveredPaidOrders?: number;
};

export type EbosValidationOrderSummary = {
  ordersAvailable: boolean;
  totalOrders: number;
  paidOrders: number;
  revenue: number;
  refundedAmount: number;
  refundCount: number;
  pendingRefundOrders?: number;
  undeliveredPaidOrders?: number;
  testOrdersExcluded?: number;
  ordersByProductOrSlug: Record<string, EbosValidationOrderProductSummary>;
  warnings: EbosValidationCaptureWarning[];
};

export type EbosValidationAutofillSource =
  | "analytics"
  | "orders"
  | "revenue_evidence"
  | "manual_slot"
  | "existing_input";

export type EbosValidationAutofillConfidence = "high" | "medium" | "low";

export type EbosValidationAutofillChange = {
  planId: string;
  field: keyof EbosValidationResultInput | string;
  oldValue: unknown;
  newValue: unknown;
  source: EbosValidationAutofillSource;
  confidence: EbosValidationAutofillConfidence;
  reason: string;
  applied: boolean;
};

export type EbosValidationManualDataSlot = {
  planId: string;
  field: string;
  label: string;
  description: string;
  sourceHint: string;
  example: unknown;
  requiredForDecision: boolean;
};

export type EbosValidationAutofillSummary = {
  candidateChanges: number;
  applicableChanges: number;
  skippedChanges: number;
  appliedChanges: number;
};

export type EbosValidationCaptureReport = {
  reportType: "validation_capture_report";
  targetDate: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  inputPath: string;
  backupPath?: string;
  analyticsSummary: EbosValidationAnalyticsSummary;
  orderSummary: EbosValidationOrderSummary;
  autofillSummary: EbosValidationAutofillSummary;
  manualDataSlots: EbosValidationManualDataSlot[];
  appliedChanges: EbosValidationAutofillChange[];
  skippedChanges: EbosValidationAutofillChange[];
  warnings: EbosValidationCaptureWarning[];
};

export type EbosValidationCaptureSummaryReference = {
  analyticsAvailable: boolean;
  eventsDetected: number;
  ctaClicksDetected: number;
  ordersAvailable: boolean;
  paidOrders: number;
  revenue: number;
  refundCount: number;
  manualSlotsCount: number;
  warnings: string[];
};

export type EbosValidationCaptureInput = EbosValidationInputFile;

