import { trackAnalyticsEvent } from "@/lib/analytics";

export type SeoAuditProductEventName =
  | "seo_audit_submitted"
  | "seo_audit_checkout_started"
  | "seo_audit_report_downloaded"
  | "seo_audit_recheck_started";

type SeoAuditProductEventInput = Omit<
  Parameters<typeof trackAnalyticsEvent>[0],
  "eventName"
> & {
  eventName: SeoAuditProductEventName;
};

export function trackSeoAuditProductEvent(input: SeoAuditProductEventInput) {
  return trackAnalyticsEvent(
    input as unknown as Parameters<typeof trackAnalyticsEvent>[0],
  );
}
