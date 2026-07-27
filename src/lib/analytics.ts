import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import {
  parseAnalyticsAttribution,
  parseAnalyticsAttributionCookieValue,
  type AnalyticsAttributionPayload
} from "@/lib/analytics-client-payload";
import { prisma } from "@/lib/db";

export const analyticsFunnelSteps = [
  "visit_home",
  "view_tool",
  "click_open_vip",
  "create_order",
  "payment_proof_submitted",
  "payment_review_approved",
  "refund_request_submitted"
] as const;

export const organicConversionFunnelSteps = [
  "seo_landing_view",
  "content_to_product_click",
  "view_tool",
  "product_purchase_cta_click",
  "begin_checkout",
  "create_order",
  "payment_proof_submitted",
  "payment_review_approved"
] as const;

export const productEngagementEventNames = [
  "content_to_product_click",
  "product_purchase_cta_click",
  "product_use_cta_click",
  "begin_checkout",
  "product_download_click"
] as const;

export const clientAnalyticsEventNames = [
  "visit_home",
  "view_tool",
  "click_open_vip",
  ...productEngagementEventNames,
  "view_pricing",
  "view_user_center",
  "search_ai_news",
  "seo_landing_view",
  "home_ai_news_cta_click",
  "home_free_claim_cta_click",
  "home_hot_ai_tools_cta_click",
  "home_account_services_cta_click",
  "home_skill_learning_cta_click",
  "home_task_outcome_click",
  "home_tool_finder_cta_click",
  "home_practical_ai_learning_click",
  "validation_ai_prompt_kit_cta_click",
  "validation_faceswap_cta_click",
  "validation_ai_video_cta_click"
] as const;

export const serverOnlyAnalyticsEventNames = [
  "create_order",
  "payment_proof_submitted",
  "payment_review_approved",
  "payment_review_rejected",
  "order_receipt_submitted",
  "refund_request_submitted"
] as const;

export const analyticsEventNames = [...clientAnalyticsEventNames, ...serverOnlyAnalyticsEventNames] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export type ClientAnalyticsEventName = (typeof clientAnalyticsEventNames)[number];

export type AnalyticsFunnelInput = {
  eventName: string;
  count: number;
};

export type AnalyticsFunnelRow = {
  eventName: (typeof analyticsFunnelSteps)[number];
  count: number;
  conversionRate: number;
};

const attributionCookieName = "enhe_analytics_attribution";
const orderAttributionEventNames = [
  "create_order",
  "payment_proof_submitted",
  "payment_review_approved",
  "payment_review_rejected",
  "order_receipt_submitted",
  "refund_request_submitted"
];

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && (analyticsEventNames as readonly string[]).includes(value);
}

export function isClientAnalyticsEventName(value: unknown): value is ClientAnalyticsEventName {
  return typeof value === "string" && (clientAnalyticsEventNames as readonly string[]).includes(value);
}

export function getPageViewEventName(path: string): AnalyticsEventName | null {
  const rawPath = path.split("?")[0].replace(/\/+$/, "") || "/";
  const normalized = rawPath === "/en" ? "/" : rawPath.replace(/^\/en(?=\/)/, "") || "/";
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

export function buildAnalyticsFunnel(rows: AnalyticsFunnelInput[]): AnalyticsFunnelRow[] {
  const counts = new Map(rows.map((row) => [row.eventName, row.count]));
  return analyticsFunnelSteps.map((eventName, index) => {
    const count = counts.get(eventName) ?? 0;
    const previousCount = index === 0 ? count : counts.get(analyticsFunnelSteps[index - 1]) ?? 0;
    return {
      eventName,
      count,
      conversionRate: index === 0 ? (count > 0 ? 100 : 0) : previousCount > 0 ? Math.round((count / previousCount) * 100) : 0
    };
  });
}

export function isMissingAnalyticsStorageError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; meta?: { table?: unknown } };
  return candidate.code === "P2021" && typeof candidate.meta?.table === "string" && candidate.meta.table.includes("analytics_events");
}

export async function trackAnalyticsEvent(input: {
  eventName: AnalyticsEventName;
  path?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    const headerStore = await headers();
    const previousOrderAttribution = await findPreviousOrderAttribution(input);
    const requestAttribution = isPaymentReviewEvent(input.eventName)
      ? null
      : parseAttributionCookie(headerStore.get("cookie"));
    const metadata = mergeAnalyticsAttribution(input.metadata, previousOrderAttribution ?? requestAttribution);
    await prisma.analyticsEvent.create({
      data: {
        eventName: input.eventName,
        path: input.path,
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
        metadata: toPrismaJson(metadata),
        ip: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: headerStore.get("user-agent")
      }
    });
  } catch (error) {
    if (isMissingAnalyticsStorageError(error)) {
      console.warn("[analytics] analytics_events table is missing; event skipped");
      return;
    }
    console.error("[analytics] failed to track event", error);
  }
}

async function findPreviousOrderAttribution(input: {
  eventName: AnalyticsEventName;
  entityType?: string | null;
  entityId?: string | null;
}) {
  if (input.entityType !== "order" || !input.entityId || input.eventName === "create_order") return null;
  const previous = await prisma.analyticsEvent.findMany({
    where: {
      entityType: "order",
      entityId: input.entityId,
      eventName: { in: orderAttributionEventNames }
    },
    select: { metadata: true },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  for (const event of previous) {
    const attribution = extractAnalyticsAttribution(event.metadata);
    if (attribution) return attribution;
  }
  return null;
}

function isPaymentReviewEvent(eventName: AnalyticsEventName) {
  return eventName === "payment_review_approved" || eventName === "payment_review_rejected";
}

function parseAttributionCookie(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const prefix = `${attributionCookieName}=`;
  const value = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length);
  return parseAnalyticsAttributionCookieValue(value);
}

function mergeAnalyticsAttribution(metadata: Record<string, unknown> | null | undefined, attribution: AnalyticsAttributionPayload | null) {
  if (!attribution) return metadata;
  return {
    ...metadata,
    sessionId: attribution.sessionId,
    landingId: attribution.landingId,
    firstLandingPath: attribution.firstLandingPath,
    attribution
  };
}

function extractAnalyticsAttribution(value: unknown): AnalyticsAttributionPayload | null {
  const metadata = getRecord(value);
  const nested = getRecord(metadata.attribution);
  return Object.keys(nested).length ? parseAnalyticsAttribution(nested) : null;
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function toPrismaJson(value?: Record<string, unknown> | null): Prisma.InputJsonValue | undefined {
  if (!value) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
