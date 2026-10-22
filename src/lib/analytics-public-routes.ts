// Shared by browser page events and SEO landing classification. Paths are normalized by callers.
export const analyticsProductRouteFamilies = [
  { path: "/software", listing: "software_listing", detail: "software_detail" },
  { path: "/tools", listing: "software_listing", detail: "software_detail" },
  { path: "/account-services", listing: "account_service_listing", detail: "account_service_detail" },
  { path: "/online-tools", listing: "account_service_listing", detail: "account_service_detail" },
  { path: "/skill-learning", listing: "skill_learning_listing", detail: "skill_learning_detail" },
  { path: "/ai-skills", listing: "ai_skill_listing", detail: "ai_skill_detail" },
  { path: "/ai-workflows", listing: "ai_workflow_listing", detail: "ai_workflow_detail" },
] as const;

export type AnalyticsProductContentType = (typeof analyticsProductRouteFamilies)[number]["listing" | "detail"];

export function getAnalyticsProductRoute(path: string) {
  const family = analyticsProductRouteFamilies.find(route => path === route.path || path.startsWith(`${route.path}/`));
  if (!family) return null;
  const listing = path === family.path;
  return {
    contentType: listing ? family.listing : family.detail,
    eventName: listing ? "view_catalog" as const : "view_tool" as const,
  };
}
