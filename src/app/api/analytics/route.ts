import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { isClientAnalyticsEventName, isMissingAnalyticsStorageError, toPrismaJson } from "@/lib/analytics";
import {
  analyticsClientStringLimits,
  analyticsTrafficMediumValues,
  normalizeAnalyticsPath,
  toSafeAnalyticsHostname,
  toSafeAnalyticsReferrerOrigin
} from "@/lib/analytics-client-payload";
import { prisma } from "@/lib/db";

const boundedString = (max: number) => z.string().trim().min(1).max(max);
const referrerSchema = z.string().trim().transform(toSafeAnalyticsReferrerOrigin).pipe(boundedString(analyticsClientStringLimits.referrer));
const hostnameSchema = z.string().trim().transform(toSafeAnalyticsHostname).pipe(boundedString(analyticsClientStringLimits.referrerHost));
const pathSchema = (max: number) => z.string().trim().transform((value) => normalizeAnalyticsPath(value, max)).pipe(boundedString(max));
const trafficMediumSchema = z.enum(analyticsTrafficMediumValues);

const attributionMetadataSchema = z.object({
  sessionId: boundedString(analyticsClientStringLimits.sessionId),
  landingId: boundedString(analyticsClientStringLimits.landingId),
  firstLandingPath: pathSchema(analyticsClientStringLimits.firstLandingPath),
  landingPath: pathSchema(analyticsClientStringLimits.landingPath),
  contentType: boundedString(analyticsClientStringLimits.contentType),
  source: boundedString(analyticsClientStringLimits.source),
  trafficMedium: trafficMediumSchema,
  searchEngine: boundedString(analyticsClientStringLimits.searchEngine).optional(),
  searchQuery: boundedString(analyticsClientStringLimits.searchQuery).optional(),
  referrer: referrerSchema.optional(),
  referrerHost: hostnameSchema.optional(),
  utmSource: boundedString(analyticsClientStringLimits.utmSource).optional(),
  utmMedium: boundedString(analyticsClientStringLimits.utmMedium).optional(),
  utmCampaign: boundedString(analyticsClientStringLimits.utmCampaign).optional(),
  locale: z.enum(["zh", "en"]),
  createdAt: z.number().int().nonnegative(),
  lastSeenAt: z.number().int().nonnegative(),
  attributionVersion: z.literal(2)
}).strict().refine((attribution) => attribution.createdAt <= attribution.lastSeenAt, {
  path: ["lastSeenAt"]
});

const analyticsMetadataSchema = z.object({
  sessionId: boundedString(analyticsClientStringLimits.sessionId).optional(),
  landingId: boundedString(analyticsClientStringLimits.landingId).optional(),
  firstLandingPath: pathSchema(analyticsClientStringLimits.firstLandingPath).optional(),
  landingPath: pathSchema(analyticsClientStringLimits.landingPath).optional(),
  contentType: boundedString(analyticsClientStringLimits.contentType).optional(),
  source: boundedString(analyticsClientStringLimits.source).optional(),
  trafficMedium: trafficMediumSchema.optional(),
  searchEngine: boundedString(analyticsClientStringLimits.searchEngine).optional(),
  searchQuery: boundedString(analyticsClientStringLimits.searchQuery).optional(),
  referrer: referrerSchema.optional(),
  referrerHost: hostnameSchema.optional(),
  utmSource: boundedString(analyticsClientStringLimits.utmSource).optional(),
  utmMedium: boundedString(analyticsClientStringLimits.utmMedium).optional(),
  utmCampaign: boundedString(analyticsClientStringLimits.utmCampaign).optional(),
  locale: z.enum(["zh", "en"]).optional(),
  query: boundedString(analyticsClientStringLimits.query).optional(),
  category: boundedString(analyticsClientStringLimits.category).optional(),
  tag: boundedString(analyticsClientStringLimits.tag).optional(),
  sort: boundedString(analyticsClientStringLimits.sort).optional(),
  target: boundedString(analyticsClientStringLimits.target).optional(),
  placement: boundedString(analyticsClientStringLimits.placement).optional(),
  surface: boundedString(analyticsClientStringLimits.surface).optional(),
  attribution: attributionMetadataSchema.optional()
}).strict();

const analyticsPayloadSchema = z.object({
  eventName: z.string(),
  path: pathSchema(analyticsClientStringLimits.path).optional().nullable(),
  entityType: boundedString(analyticsClientStringLimits.entityType).optional().nullable(),
  entityId: boundedString(analyticsClientStringLimits.entityId).optional().nullable(),
  metadata: analyticsMetadataSchema.optional().nullable()
}).strict();

export async function POST(request: Request) {
  const payload = analyticsPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success || !isClientAnalyticsEventName(payload.data.eventName)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const user = await getCurrentUser();
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  try {
    await prisma.analyticsEvent.create({
      data: {
        eventName: payload.data.eventName,
        path: payload.data.path,
        entityType: payload.data.entityType,
        entityId: payload.data.entityId,
        userId: user?.id,
        metadata: toPrismaJson(payload.data.metadata),
        ip: forwardedFor,
        userAgent: request.headers.get("user-agent")
      }
    });
  } catch (error) {
    if (isMissingAnalyticsStorageError(error)) {
      console.warn("[analytics] analytics_events table is missing; event accepted but not stored");
      return NextResponse.json({ ok: true, stored: false }, { status: 202 });
    }
    console.error("[analytics] failed to store event", error);
    return NextResponse.json({ ok: true, stored: false }, { status: 202 });
  }

  return NextResponse.json({ ok: true });
}
