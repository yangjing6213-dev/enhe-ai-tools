import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildAnalyticsEventMetadata,
  isAnalyticsEventName,
  isClientWritableAnalyticsEventName,
  isMissingAnalyticsStorageError,
  toPrismaJson,
} from "@/lib/analytics";
import {
  analyticsClientStringLimits,
  analyticsTrafficMediumValues,
  normalizeAnalyticsPath,
  toSafeAnalyticsHostname,
  toSafeAnalyticsReferrerOrigin,
} from "@/lib/analytics-client-payload";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const maxRequestBytes = 8 * 1024;
const identifierPattern = /^[A-Za-z0-9._:-]+$/;
const boundedString = (max: number) => z.string().trim().min(1).max(max);
const referrerSchema = z
  .string()
  .trim()
  .transform(toSafeAnalyticsReferrerOrigin)
  .pipe(boundedString(analyticsClientStringLimits.referrer));
const hostnameSchema = z
  .string()
  .trim()
  .transform(toSafeAnalyticsHostname)
  .pipe(boundedString(analyticsClientStringLimits.referrerHost));
const pathSchema = (max: number) => z
  .string()
  .trim()
  .transform((value) => normalizeAnalyticsPath(value, max))
  .pipe(boundedString(max));
const trafficMediumSchema = z.enum(analyticsTrafficMediumValues);

const attributionMetadataSchema = z
  .object({
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
    attributionVersion: z.literal(2),
  })
  .strict()
  .refine((attribution) => attribution.createdAt <= attribution.lastSeenAt, {
    path: ["lastSeenAt"],
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
  promptId: boundedString(analyticsClientStringLimits.promptId).optional(),
  offerCount: z.number().int().min(0).max(100).optional(),
  attribution: attributionMetadataSchema.optional(),
});

const eventEnvelopeSchema = z
  .object({ eventName: z.string().max(80) })
  .passthrough();
const analyticsPayloadSchema = z
  .object({
    eventName: z.string().max(80),
    path: pathSchema(analyticsClientStringLimits.path).optional().nullable(),
    entityType: boundedString(analyticsClientStringLimits.entityType)
      .regex(/^[a-z0-9_:-]+$/)
      .optional()
      .nullable(),
    entityId: boundedString(analyticsClientStringLimits.entityId)
      .regex(identifierPattern)
      .optional()
      .nullable(),
    metadata: analyticsMetadataSchema.optional().nullable(),
    context: z
      .object({
        clientId: z.string().max(128).regex(identifierPattern).optional(),
        sessionId: z.string().max(128).regex(identifierPattern).optional(),
        source: z.string().max(120).optional(),
        medium: z.string().max(120).optional(),
        campaign: z.string().max(160).optional(),
        offerId: z.string().max(160).regex(identifierPattern).optional(),
      })
      .strict()
      .optional()
      .nullable(),
  })
  .strict();

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return jsonError("UNSUPPORTED_MEDIA_TYPE", 415);
  }

  const body = await readBoundedJson(request);
  if (body === requestTooLarge) return jsonError("REQUEST_TOO_LARGE", 413);
  const envelope = eventEnvelopeSchema.safeParse(body);
  if (!envelope.success || !isAnalyticsEventName(envelope.data.eventName)) {
    return jsonError("INVALID_REQUEST", 400);
  }
  if (!isClientWritableAnalyticsEventName(envelope.data.eventName)) {
    return jsonError("SERVER_ONLY_EVENT", 403);
  }
  const eventName = envelope.data.eventName;
  const payload = analyticsPayloadSchema.safeParse(body);
  if (!payload.success) {
    return jsonError("INVALID_REQUEST", 400);
  }

  const user = await getCurrentUser();
  const forwardedFor =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  try {
    await prisma.analyticsEvent.create({
      data: {
        eventName,
        path: payload.data.path,
        entityType: payload.data.entityType,
        entityId: payload.data.entityId,
        userId: user?.id,
        metadata: toPrismaJson(
          buildAnalyticsEventMetadata({
            eventName,
            trust: "client",
            metadata: payload.data.metadata,
            context: payload.data.context,
          }),
        ),
        ip: forwardedFor,
        userAgent: request.headers.get("user-agent"),
      },
    });
  } catch (error) {
    if (isMissingAnalyticsStorageError(error)) {
      console.warn(
        "[analytics] analytics_events table is missing; event was not stored",
      );
      return NextResponse.json(
        { ok: false, stored: false },
        { status: 503 },
      );
    }
    console.error("[analytics] failed to store event", error);
    return NextResponse.json(
      { ok: false, stored: false },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}

const requestTooLarge = Symbol("requestTooLarge");

async function readBoundedJson(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxRequestBytes) {
    return requestTooLarge;
  }
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > maxRequestBytes) return requestTooLarge;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function jsonError(code: string, status: number) {
  return NextResponse.json({ ok: false, code }, { status });
}
