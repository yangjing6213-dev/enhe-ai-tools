import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildAnalyticsEventMetadata,
  isAnalyticsEventName,
  isClientWritableAnalyticsEventName,
  isMissingAnalyticsStorageError,
  toPrismaJson,
} from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const maxRequestBytes = 8 * 1024;
const identifierPattern = /^[A-Za-z0-9._:-]+$/;
const eventEnvelopeSchema = z
  .object({ eventName: z.string().max(80) })
  .passthrough();
const analyticsPayloadSchema = z
  .object({
    eventName: z.string().max(80),
    path: z
      .string()
      .max(300)
      .regex(/^\/[^\s?#]*$/)
      .optional()
      .nullable(),
    entityType: z
      .string()
      .max(80)
      .regex(/^[a-z0-9_:-]+$/)
      .optional()
      .nullable(),
    entityId: z
      .string()
      .max(120)
      .regex(identifierPattern)
      .optional()
      .nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
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
