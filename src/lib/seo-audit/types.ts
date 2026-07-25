export type SeoAuditOfferCode =
  | "free"
  | "professional"
  | "deep"
  | "monitoring";

export type SeoAuditOrderType =
  | "seo_audit_credit"
  | "seo_audit_monitoring"
  | null;

export type SeoAuditOfferRequest = {
  code?: unknown;
  [key: string]: unknown;
};

export type SeoAuditOfferContext = {
  now: Date;
  professionalLaunchSales: number;
};

export type ResolvedSeoAuditOffer = {
  code: SeoAuditOfferCode;
  orderType: SeoAuditOrderType;
  price: number;
  regularPrice: number;
  pageLimit: number;
  validityDays: number;
  includedRuns?: number;
  publicFindingLimit?: number;
  maxScheduledRuns?: number;
  manualRuns?: number;
};
