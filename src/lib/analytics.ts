import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import {
  clientWritableAnalyticsEventNames,
  getPageViewEventName,
  isClientWritableAnalyticsEventName,
} from "@/lib/analytics-client";
import { prisma } from "@/lib/db";

export {
  clientWritableAnalyticsEventNames,
  getPageViewEventName,
  isClientWritableAnalyticsEventName,
};

export const analyticsFunnelSteps = [
  "visit_home",
  "view_tool",
  "click_open_vip",
  "create_order",
  "payment_proof_submitted",
  "payment_review_approved",
  "refund_request_submitted",
] as const;

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

export const seoAuditFunnelSteps = [
  "seo_audit_landing_view",
  "seo_audit_submitted",
  "seo_audit_completed",
  "seo_audit_paywall_viewed",
  "seo_audit_checkout_started",
  "seo_audit_purchased",
  "seo_audit_report_downloaded",
] as const;

export const analyticsEventNames = [
  ...analyticsFunnelSteps,
  ...seoAuditEventNames,
  "view_pricing",
  "view_user_center",
  "payment_review_rejected",
  "order_receipt_submitted",
  "search_ai_news",
  "seo_landing_view",
  "home_free_claim_cta_click",
  "home_hot_ai_tools_cta_click",
  "validation_ai_prompt_kit_cta_click",
  "validation_faceswap_cta_click",
  "validation_ai_video_cta_click",
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export type SeoAuditAnalyticsEventName = (typeof seoAuditEventNames)[number];
export type SeoAuditFunnelEventName = (typeof seoAuditFunnelSteps)[number];

export type AnalyticsCorrelationContext = {
  clientId?: string;
  sessionId?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  offerId?: string;
  orderId?: string;
};

export type AnalyticsNetworkContext = {
  ip: string | null;
  userAgent: string | null;
};

export type AnalyticsFunnelInput = {
  eventName: string;
  count: number;
};

export type AnalyticsFunnelRow = {
  eventName: (typeof analyticsFunnelSteps)[number];
  count: number;
  conversionRate: number;
};

type ClientMetadataRule =
  | { type: "string"; maxLength: number; pattern?: RegExp }
  | { type: "integer"; minimum: number; maximum: number };

const identifierPattern = /^[A-Za-z0-9._:-]+$/;
const slugPattern = /^[A-Za-z0-9._/-]+$/;
const hostPattern = /^[A-Za-z0-9.-]+$/;
const safeAttributionPattern = /^[\p{L}\p{N} ._~:+/-]+$/u;
const localePattern = /^(?:zh|en)$/;
const clientMetadataMaxKeys = 10;
const clientMetadataMaxBytes = 2_048;

const clientMetadataRules: Partial<
  Record<AnalyticsEventName, Record<string, ClientMetadataRule>>
> = {
  click_open_vip: {
    placement: stringRule(80, identifierPattern),
  },
  search_ai_news: {
    locale: stringRule(2, localePattern),
    category: stringRule(80, slugPattern),
    tag: stringRule(80, slugPattern),
    sort: stringRule(40, identifierPattern),
  },
  seo_landing_view: {
    landingPath: stringRule(300, /^\/[^\s?#]*$/),
    contentType: stringRule(80, identifierPattern),
    source: stringRule(80, safeAttributionPattern),
    trafficMedium: stringRule(80, safeAttributionPattern),
    searchEngine: stringRule(80, identifierPattern),
    referrerHost: stringRule(253, hostPattern),
    utmSource: stringRule(120, safeAttributionPattern),
    utmMedium: stringRule(120, safeAttributionPattern),
    utmCampaign: stringRule(160, safeAttributionPattern),
    locale: stringRule(2, localePattern),
  },
  home_free_claim_cta_click: actionMetadataRules(),
  home_hot_ai_tools_cta_click: actionMetadataRules(),
  validation_ai_prompt_kit_cta_click: {
    surface: stringRule(80, identifierPattern),
  },
  validation_faceswap_cta_click: {
    surface: stringRule(80, identifierPattern),
  },
  validation_ai_video_cta_click: {
    surface: stringRule(80, identifierPattern),
  },
  seo_audit_paywall_viewed: {
    offerCount: {
      type: "integer",
      minimum: 0,
      maximum: 100,
    },
    placement: stringRule(80, identifierPattern),
  },
  seo_audit_prompt_copied: {
    promptId: stringRule(128, identifierPattern),
  },
};

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

export function sanitizeClientAnalyticsMetadata(
  eventName: AnalyticsEventName,
  metadata: Record<string, unknown> | null | undefined,
) {
  const rules = clientMetadataRules[eventName];
  if (!rules || !metadata) return {};

  const sanitized: Record<string, string | number> = {};
  for (const [key, rule] of Object.entries(rules).slice(
    0,
    clientMetadataMaxKeys,
  )) {
    const value = sanitizeClientMetadataValue(metadata[key], rule);
    if (value !== undefined) sanitized[key] = value;
  }

  return serializedByteLength(sanitized) <= clientMetadataMaxBytes
    ? sanitized
    : {};
}

export function buildAnalyticsEventMetadata(input: {
  eventName: AnalyticsEventName;
  trust: "client" | "server";
  metadata?: Record<string, unknown> | null;
  context?: AnalyticsCorrelationContext | null;
}) {
  const metadata =
    input.trust === "client"
      ? sanitizeClientAnalyticsMetadata(input.eventName, input.metadata)
      : { ...(input.metadata ?? {}) };
  for (const key of [
    "eventTrust",
    "product",
    "clientId",
    "sessionId",
    "source",
    "medium",
    "campaign",
    "offerId",
    "orderId",
  ]) {
    delete metadata[key];
  }

  const context = normalizeAnalyticsCorrelationContext(
    input.context,
    input.trust,
  );
  return {
    ...metadata,
    ...(isSeoAuditAnalyticsEventName(input.eventName)
      ? { product: "seo_geo_audit" }
      : {}),
    eventTrust: input.trust,
    ...context,
  };
}

export function buildAnalyticsFunnel(
  rows: AnalyticsFunnelInput[],
): AnalyticsFunnelRow[] {
  const counts = new Map(rows.map((row) => [row.eventName, row.count]));
  return analyticsFunnelSteps.map((eventName, index) => {
    const count = counts.get(eventName) ?? 0;
    const previousCount =
      index === 0
        ? count
        : (counts.get(analyticsFunnelSteps[index - 1]) ?? 0);
    return {
      eventName,
      count,
      conversionRate:
        index === 0
          ? count > 0
            ? 100
            : 0
          : previousCount > 0
            ? Math.round((count / previousCount) * 100)
            : 0,
    };
  });
}

export function isMissingAnalyticsStorageError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; meta?: { table?: unknown } };
  return (
    candidate.code === "P2021" &&
    typeof candidate.meta?.table === "string" &&
    candidate.meta.table.includes("analytics_events")
  );
}

export async function trackAnalyticsEvent(input: {
  eventName: AnalyticsEventName;
  path?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
  context?: AnalyticsCorrelationContext | null;
  networkContext?: AnalyticsNetworkContext;
}) {
  const networkContext = await resolveAnalyticsNetworkContext(
    input.networkContext,
  );
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventName: input.eventName,
        path: input.path,
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
        metadata: toPrismaJson(
          buildAnalyticsEventMetadata({
            eventName: input.eventName,
            trust: "server",
            metadata: input.metadata,
            context: input.context,
          }),
        ),
        ip: networkContext.ip,
        userAgent: networkContext.userAgent,
      },
    });
  } catch (error) {
    if (isMissingAnalyticsStorageError(error)) {
      console.warn(
        "[analytics] analytics_events table is missing; event skipped",
      );
      return;
    }
    console.error("[analytics] failed to track event", error);
  }
}

export function toPrismaJson(
  value?: Record<string, unknown> | null,
): Prisma.InputJsonValue | undefined {
  if (!value) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function stringRule(maxLength: number, pattern?: RegExp): ClientMetadataRule {
  return { type: "string", maxLength, pattern };
}

function actionMetadataRules(): Record<string, ClientMetadataRule> {
  return {
    target: stringRule(80, identifierPattern),
    placement: stringRule(80, identifierPattern),
  };
}

function sanitizeClientMetadataValue(
  value: unknown,
  rule: ClientMetadataRule,
) {
  if (rule.type === "integer") {
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= rule.minimum &&
      value <= rule.maximum
      ? value
      : undefined;
  }
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > rule.maxLength ||
    (rule.pattern && !rule.pattern.test(normalized))
  ) {
    return undefined;
  }
  return normalized;
}

function serializedByteLength(value: Record<string, unknown>) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

async function resolveAnalyticsNetworkContext(
  explicitContext: AnalyticsNetworkContext | undefined,
): Promise<AnalyticsNetworkContext> {
  if (explicitContext !== undefined) {
    return normalizeAnalyticsNetworkContext(explicitContext);
  }

  try {
    const headerStore = await headers();
    return normalizeAnalyticsNetworkContext({
      ip: headerStore.get("x-forwarded-for")?.split(",")[0] ?? null,
      userAgent: headerStore.get("user-agent"),
    });
  } catch {
    return { ip: null, userAgent: null };
  }
}

function normalizeAnalyticsNetworkContext(
  context: AnalyticsNetworkContext,
): AnalyticsNetworkContext {
  return {
    ip: normalizeAnalyticsNetworkString(context.ip, 64),
    userAgent: normalizeAnalyticsNetworkString(context.userAgent, 512),
  };
}

function normalizeAnalyticsNetworkString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().slice(0, maxLength);
  return normalized || null;
}

function normalizeAnalyticsCorrelationContext(
  context: AnalyticsCorrelationContext | null | undefined,
  trust: "client" | "server",
) {
  const normalized: AnalyticsCorrelationContext = {};
  assignContextString(
    normalized,
    "clientId",
    context?.clientId,
    128,
    trust === "client" ? identifierPattern : undefined,
  );
  assignContextString(
    normalized,
    "sessionId",
    context?.sessionId,
    128,
    trust === "client" ? identifierPattern : undefined,
  );
  assignContextString(
    normalized,
    "source",
    context?.source,
    120,
    trust === "client" ? safeAttributionPattern : undefined,
  );
  assignContextString(
    normalized,
    "medium",
    context?.medium,
    120,
    trust === "client" ? safeAttributionPattern : undefined,
  );
  assignContextString(
    normalized,
    "campaign",
    context?.campaign,
    160,
    trust === "client" ? safeAttributionPattern : undefined,
  );
  assignContextString(
    normalized,
    "offerId",
    context?.offerId,
    160,
    trust === "client" ? identifierPattern : undefined,
  );
  if (trust === "server") {
    assignContextString(normalized, "orderId", context?.orderId, 160);
  }
  return normalized;
}

function assignContextString(
  target: AnalyticsCorrelationContext,
  key: keyof AnalyticsCorrelationContext,
  value: unknown,
  maxLength: number,
  pattern?: RegExp,
) {
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || (pattern && !pattern.test(trimmed))) {
    return;
  }
  target[key] = trimmed;
}
