import type {
  EbosValidationAnalyticsEvent,
  EbosValidationAnalyticsSummary,
  EbosValidationCaptureWarning
} from "./validation-capture-types";

export const validationCtaEventNames = [
  "validation_ai_prompt_kit_cta_click",
  "validation_faceswap_cta_click",
  "validation_ai_video_cta_click"
] as const;

const pageViewEventNames = new Set([
  "page_view",
  "route_view",
  "analytics_page_view",
  "validation_page_view"
]);

const validationPaths = {
  aiPromptKit: ["/validation/ai-prompt-kit", "/en/validation/ai-prompt-kit"],
  faceswap: ["/software/faceswap-studio-ai", "/en/software/faceswap-studio-ai"],
  aiVideo: [
    "/software/local-ai-video-studio-for-creator-workflows",
    "/en/software/local-ai-video-studio-for-creator-workflows"
  ]
} as const;

type AnalyticsModel = {
  findMany(args?: unknown): Promise<unknown[]>;
};

type AnalyticsPrismaClient = {
  analyticsEvent?: AnalyticsModel;
};

export async function readValidationAnalytics(options: {
  prismaClient?: AnalyticsPrismaClient;
  periodStart?: string | Date;
  periodEnd?: string | Date;
} = {}): Promise<EbosValidationAnalyticsSummary> {
  try {
    const client = options.prismaClient ?? await loadDefaultPrismaClient();
    if (!client.analyticsEvent?.findMany) {
      return emptySummary(false, [warning(
        "analytics_model_unavailable",
        "AnalyticsEvent model is unavailable; validation analytics cannot be captured automatically."
      )]);
    }

    const events = await client.analyticsEvent.findMany(buildAnalyticsQuery(options));
    return summarizeAnalyticsEvents(events.map(normalizeAnalyticsEvent));
  } catch (error) {
    return emptySummary(false, [warning(
      "analytics_query_failed",
      `Analytics query failed; continuing without automatic analytics data. ${safeErrorMessage(error)}`
    )]);
  }
}

export function summarizeAnalyticsEvents(events: EbosValidationAnalyticsEvent[]): EbosValidationAnalyticsSummary {
  const eventsByName: Record<string, number> = {};
  const eventsByPath: Record<string, number> = {};
  let pageViewsDetected = 0;
  let ctaClicksDetected = 0;

  for (const event of events) {
    eventsByName[event.eventName] = (eventsByName[event.eventName] ?? 0) + 1;
    if (isValidationCtaEvent(event.eventName)) ctaClicksDetected += 1;
    if (isPageViewEvent(event.eventName)) {
      pageViewsDetected += 1;
      const path = normalizePath(event.path);
      if (path) eventsByPath[path] = (eventsByPath[path] ?? 0) + 1;
    }
  }

  return {
    analyticsAvailable: true,
    eventsDetected: events.length,
    pageViewsDetected,
    ctaClicksDetected,
    eventsByName,
    eventsByPath,
    warnings: []
  };
}

export function mapAnalyticsEventsToValidationMetrics(events: EbosValidationAnalyticsEvent[]) {
  return mapAnalyticsSummaryToValidationMetrics(summarizeAnalyticsEvents(events));
}

export function mapAnalyticsSummaryToValidationMetrics(summary: EbosValidationAnalyticsSummary) {
  return {
    "validation-direction-3-ai-prompt-kit": {
      ctaClicks: summary.eventsByName.validation_ai_prompt_kit_cta_click ?? 0,
      pageViews: sumPaths(summary.eventsByPath, validationPaths.aiPromptKit)
    },
    "validation-product-1-faceswap-studio-ai": {
      productPageCtaClicks: summary.eventsByName.validation_faceswap_cta_click ?? 0,
      productPageViews: sumPaths(summary.eventsByPath, validationPaths.faceswap)
    },
    "validation-product-2-local-ai-video-studio-for-creator-workflows": {
      productPageCtaClicks: summary.eventsByName.validation_ai_video_cta_click ?? 0,
      productPageViews: sumPaths(summary.eventsByPath, validationPaths.aiVideo)
    }
  } satisfies Record<string, Record<string, number>>;
}

function buildAnalyticsQuery(options: { periodStart?: string | Date; periodEnd?: string | Date }) {
  const createdAt: Record<string, Date> = {};
  if (options.periodStart) createdAt.gte = toDate(options.periodStart);
  if (options.periodEnd) createdAt.lte = toDate(options.periodEnd);
  return {
    where: Object.keys(createdAt).length ? { createdAt } : undefined,
    select: {
      eventName: true,
      path: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true
    }
  };
}

async function loadDefaultPrismaClient(): Promise<AnalyticsPrismaClient> {
  const mod = await import("@/lib/db");
  return mod.prisma as unknown as AnalyticsPrismaClient;
}

function normalizeAnalyticsEvent(value: unknown): EbosValidationAnalyticsEvent {
  const row = toRecord(value);
  return {
    eventName: readString(row.eventName) ?? readString(row.event_name) ?? "unknown_event",
    path: readString(row.path),
    entityType: readString(row.entityType) ?? readString(row.entity_type),
    entityId: readString(row.entityId) ?? readString(row.entity_id),
    metadata: row.metadata,
    createdAt: row.createdAt instanceof Date || typeof row.createdAt === "string" ? row.createdAt : undefined
  };
}

function isValidationCtaEvent(eventName: string) {
  return (validationCtaEventNames as readonly string[]).includes(eventName);
}

function isPageViewEvent(eventName: string) {
  return pageViewEventNames.has(eventName);
}

function normalizePath(value: string | null | undefined) {
  if (!value) return null;
  const path = value.split("?")[0]?.replace(/\/+$/, "") || "/";
  return path;
}

function sumPaths(eventsByPath: Record<string, number>, paths: readonly string[]) {
  return paths.reduce((total, path) => total + (eventsByPath[path] ?? 0), 0);
}

function emptySummary(analyticsAvailable: boolean, warnings: EbosValidationCaptureWarning[]): EbosValidationAnalyticsSummary {
  return {
    analyticsAvailable,
    eventsDetected: 0,
    pageViewsDetected: 0,
    ctaClicksDetected: 0,
    eventsByName: {},
    eventsByPath: {},
    warnings
  };
}

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function warning(code: string, message: string): EbosValidationCaptureWarning {
  return { code, severity: "warning", message, source: "internal_database" };
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}

