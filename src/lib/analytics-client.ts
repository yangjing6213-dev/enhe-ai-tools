export const clientWritableAnalyticsEventNames = [
  "visit_home",
  "view_tool",
  "click_open_vip",
  "view_pricing",
  "view_user_center",
  "search_ai_news",
  "seo_landing_view",
  "home_free_claim_cta_click",
  "home_hot_ai_tools_cta_click",
  "validation_ai_prompt_kit_cta_click",
  "validation_faceswap_cta_click",
  "validation_ai_video_cta_click",
  "seo_audit_landing_view",
  "seo_audit_summary_viewed",
  "seo_audit_paywall_viewed",
  "seo_audit_prompt_copied",
  "seo_audit_monitoring_viewed",
] as const;

export type ClientWritableAnalyticsEventName =
  (typeof clientWritableAnalyticsEventNames)[number];

const clientWritableEventSet = new Set<string>(
  clientWritableAnalyticsEventNames,
);

export function isClientWritableAnalyticsEventName(
  value: unknown,
): value is ClientWritableAnalyticsEventName {
  return typeof value === "string" && clientWritableEventSet.has(value);
}

export function normalizeAnalyticsPublicPath(path: string) {
  const rawPath =
    String(path || "/")
      .split("?")[0]
      .replace(/\/+$/, "") || "/";
  if (rawPath === "/en") return "/";
  return rawPath.replace(/^\/en(?=\/)/, "") || "/";
}

export function getPageViewEventName(
  path: string,
): ClientWritableAnalyticsEventName | null {
  const normalized = normalizeAnalyticsPublicPath(path);
  if (normalized === "/") return "visit_home";
  if (normalized === "/pricing") return "view_pricing";
  if (normalized === "/user") return "view_user_center";
  if (
    normalized.startsWith("/software/") ||
    normalized.startsWith("/skill-learning/") ||
    normalized.startsWith("/account-services/") ||
    normalized.startsWith("/tools/")
  ) {
    return "view_tool";
  }
  return null;
}
