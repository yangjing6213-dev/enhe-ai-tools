import {
  clientWritableAnalyticsEventNames,
  isClientWritableAnalyticsEventName,
} from "@/lib/analytics-client";

export { clientWritableAnalyticsEventNames, isClientWritableAnalyticsEventName };

export const clientAnalyticsEventNames = clientWritableAnalyticsEventNames;

export const seoAuditEventNames = [
  "seo_audit_landing_view",
  "seo_audit_submitted",
  "seo_audit_completed",
  "seo_audit_failed",
  "seo_audit_summary_viewed",
  "seo_audit_paywall_viewed",
  "seo_audit_checkout_started",
  "seo_audit_purchased",
  "seo_audit_report_downloaded",
  "seo_audit_prompt_copied",
  "seo_audit_recheck_started",
  "seo_audit_monitoring_viewed",
  "seo_audit_monitoring_purchased",
  "seo_audit_schedule_enabled",
  "seo_audit_schedule_paused",
] as const;

const seoAuditServerEventNames = [
  "seo_audit_submitted",
  "seo_audit_completed",
  "seo_audit_failed",
  "seo_audit_checkout_started",
  "seo_audit_purchased",
  "seo_audit_report_downloaded",
  "seo_audit_recheck_started",
  "seo_audit_monitoring_purchased",
  "seo_audit_schedule_enabled",
  "seo_audit_schedule_paused",
] as const;

export const serverOnlyAnalyticsEventNames = [
  "create_order",
  "payment_proof_submitted",
  "payment_review_approved",
  "payment_review_rejected",
  "order_receipt_submitted",
  "refund_request_submitted",
] as const;

export const analyticsEventNames = [
  ...clientAnalyticsEventNames,
  ...serverOnlyAnalyticsEventNames,
  ...seoAuditServerEventNames,
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export type ClientAnalyticsEventName =
  (typeof clientAnalyticsEventNames)[number];
export type SeoAuditAnalyticsEventName = (typeof seoAuditEventNames)[number];

export function isAnalyticsEventName(
  value: unknown,
): value is AnalyticsEventName {
  return (
    typeof value === "string" &&
    (analyticsEventNames as readonly string[]).includes(value)
  );
}

export function isSeoAuditAnalyticsEventName(
  value: unknown,
): value is SeoAuditAnalyticsEventName {
  return (
    typeof value === "string" &&
    (seoAuditEventNames as readonly string[]).includes(value)
  );
}

export function isClientWritableAnalyticsEvent(
  value: unknown,
): value is AnalyticsEventName {
  return (
    isAnalyticsEventName(value) && isClientWritableAnalyticsEventName(value)
  );
}

export function isClientAnalyticsEventName(
  value: unknown,
): value is ClientAnalyticsEventName {
  return isClientWritableAnalyticsEventName(value);
}
