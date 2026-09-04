import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
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

export const analyticsEventNames = [
  ...analyticsFunnelSteps,
  "view_pricing",
  "view_user_center",
  "payment_review_rejected",
  "order_receipt_submitted",
  "search_ai_news",
  "seo_landing_view"
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export type AnalyticsFunnelInput = {
  eventName: string;
  count: number;
};

export type AnalyticsFunnelRow = {
  eventName: (typeof analyticsFunnelSteps)[number];
  count: number;
  conversionRate: number;
};

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && (analyticsEventNames as readonly string[]).includes(value);
}

export function getPageViewEventName(path: string): AnalyticsEventName | null {
  const normalized = path.split("?")[0].replace(/\/+$/, "") || "/";
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
    await prisma.analyticsEvent.create({
      data: {
        eventName: input.eventName,
        path: input.path,
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
        metadata: toPrismaJson(input.metadata),
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

export function toPrismaJson(value?: Record<string, unknown> | null): Prisma.InputJsonValue | undefined {
  if (!value) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
