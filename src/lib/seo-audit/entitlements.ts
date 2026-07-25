import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sanitizeStoredSeoAuditPublicFindings } from "@/lib/seo-audit/artifacts";

export type SeoAuditEntitlementErrorCode =
  | "INVALID_TARGET"
  | "ENTITLEMENT_UNAVAILABLE"
  | "ORDER_NOT_ELIGIBLE"
  | "IP_DAILY_LIMIT"
  | "ORIGIN_DAILY_LIMIT"
  | "QUEUE_CAPACITY_REACHED"
  | "PUBLIC_TOKEN_ACTIVE"
  | "CONFIGURATION_ERROR";

export class SeoAuditEntitlementError extends Error {
  readonly code: SeoAuditEntitlementErrorCode;

  constructor(code: SeoAuditEntitlementErrorCode) {
    super(code);
    this.name = "SeoAuditEntitlementError";
    this.code = code;
  }
}

type EntitlementDatabase = typeof prisma;

type EntitlementOptions = {
  db?: EntitlementDatabase;
  now?: Date;
};

type AnonymousOptions = EntitlementOptions & {
  hmacSecret?: string;
};

type DueScheduleRow = {
  scheduleId: string;
  subscriptionId: string;
  userId: string;
  projectId: string;
  offerId: string;
  targetUrl: string;
  pageLimit: number;
  cadence: "weekly" | "biweekly" | "monthly";
  nextRunAt: Date;
};

function resolveNow(value: Date | undefined) {
  return value ? new Date(value) : new Date();
}

function invalidTarget(): never {
  throw new SeoAuditEntitlementError("INVALID_TARGET");
}

function isPrivateIpv4(hostname: string) {
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return true;
  }
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.toLowerCase();
  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized)
  ) {
    return true;
  }
  const mappedIpv4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);
  return mappedIpv4 ? isPrivateIpv4(mappedIpv4[1]) : false;
}

function assertPublicHostname(hostnameValue: string) {
  const hostname = hostnameValue.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    invalidTarget();
  }
  const ipVersion = isIP(hostname);
  if (
    (ipVersion === 4 && isPrivateIpv4(hostname)) ||
    (ipVersion === 6 && isPrivateIpv6(hostname))
  ) {
    invalidTarget();
  }
}

export function normalizeSeoAuditTarget(input: string) {
  if (typeof input !== "string" || input.length > 2048) invalidTarget();

  let target: URL;
  try {
    target = new URL(input.trim());
  } catch {
    invalidTarget();
  }
  if (
    (target.protocol !== "http:" && target.protocol !== "https:") ||
    target.username ||
    target.password
  ) {
    invalidTarget();
  }
  assertPublicHostname(target.hostname);
  target.hash = "";

  return {
    targetUrl: target.toString(),
    normalizedOrigin: target.origin,
  };
}

export function hashAnonymousAuditIdentifier(value: string, secret: string) {
  if (!secret || secret.length < 32) {
    throw new SeoAuditEntitlementError("CONFIGURATION_ERROR");
  }
  return createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

function hashPublicToken(token: string) {
  if (!token || token.length < 24 || token.length > 512 || /\s/.test(token)) {
    throw new SeoAuditEntitlementError("PUBLIC_TOKEN_ACTIVE");
  }
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function consumeSeoAuditCreditAndEnqueue(
  input: {
    userId: string;
    creditId: string;
    kind: "professional" | "deep";
    targetUrl: string;
  },
  options: EntitlementOptions = {},
) {
  const target = normalizeSeoAuditTarget(input.targetUrl);
  const db = options.db ?? prisma;
  const now = resolveNow(options.now);

  return db.$transaction(async (tx) => {
    const consumed = await tx.seoAuditCredit.updateMany({
      where: {
        id: input.creditId,
        userId: input.userId,
        runKind: input.kind,
        remainingRuns: { gt: 0 },
        expiresAt: { gt: now },
        refundedAt: null,
      },
      data: { remainingRuns: { decrement: 1 } },
    });
    if (consumed.count !== 1) {
      throw new SeoAuditEntitlementError("ENTITLEMENT_UNAVAILABLE");
    }
    const credit = await tx.seoAuditCredit.findUnique({
      where: { id: input.creditId },
      select: { offerId: true, orderId: true, pageLimit: true },
    });
    if (!credit) {
      throw new SeoAuditEntitlementError("ENTITLEMENT_UNAVAILABLE");
    }

    const run = await tx.seoAuditRun.create({
      data: {
        userId: input.userId,
        offerId: credit.offerId,
        sourceOrderId: credit.orderId,
        creditId: input.creditId,
        status: "queued",
        kind: input.kind,
        targetUrl: target.targetUrl,
        normalizedOrigin: target.normalizedOrigin,
        pageLimit: credit.pageLimit,
        totalTimeoutSeconds: 720,
        availableAt: now,
      },
      select: { id: true },
    });
    return { runId: run.id };
  });
}

export async function grantSeoAuditCreditForPaidOrder(
  orderId: string,
  options: EntitlementOptions = {},
) {
  const db = options.db ?? prisma;
  const now = resolveNow(options.now);

  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        orderType: true,
        orderStatus: true,
        paidAt: true,
        seoAuditCredit: { select: { id: true } },
        seoAuditOffer: {
          select: {
            id: true,
            code: true,
            includedRuns: true,
            pageLimit: true,
            validityDays: true,
          },
        },
      },
    });
    if (
      !order ||
      order.orderType !== "seo_audit_credit" ||
      (order.orderStatus !== "paid" && order.orderStatus !== "activated") ||
      !order.seoAuditOffer ||
      (order.seoAuditOffer.code !== "professional" &&
        order.seoAuditOffer.code !== "deep") ||
      !order.seoAuditOffer.includedRuns ||
      order.seoAuditOffer.includedRuns < 1
    ) {
      throw new SeoAuditEntitlementError("ORDER_NOT_ELIGIBLE");
    }
    if (order.seoAuditCredit) {
      return {
        creditId: order.seoAuditCredit.id,
        alreadyGranted: true,
      };
    }

    const credit = await tx.seoAuditCredit.create({
      data: {
        userId: order.userId,
        offerId: order.seoAuditOffer.id,
        orderId: order.id,
        runKind: order.seoAuditOffer.code,
        pageLimit: order.seoAuditOffer.pageLimit,
        totalRuns: order.seoAuditOffer.includedRuns,
        remainingRuns: order.seoAuditOffer.includedRuns,
        expiresAt: addDays(
          order.paidAt ?? now,
          order.seoAuditOffer.validityDays,
        ),
      },
      select: { id: true },
    });
    return { creditId: credit.id, alreadyGranted: false };
  });
}

function startOfUtcDay(now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

async function acquireAnonymousLimitLocks(
  tx: Prisma.TransactionClient,
  keys: string[],
) {
  for (const key of [...keys].sort()) {
    await tx.$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0)) IS NULL AS "lockAcquired"`,
    );
  }
}

export async function enqueueAnonymousFreeAudit(
  input: {
    ipAddress: string;
    targetUrl: string;
    publicToken: string;
    engineVersion: string;
  },
  options: AnonymousOptions = {},
) {
  const target = normalizeSeoAuditTarget(input.targetUrl);
  const db = options.db ?? prisma;
  const now = resolveNow(options.now);
  const hmacSecret =
    options.hmacSecret ?? process.env.SEO_AUDIT_ANONYMOUS_HMAC_SECRET ?? "";
  const requestIpHash = hashAnonymousAuditIdentifier(
    input.ipAddress.trim(),
    hmacSecret,
  );
  const requestOriginHash = hashAnonymousAuditIdentifier(
    target.normalizedOrigin,
    hmacSecret,
  );
  const publicTokenHash = hashPublicToken(input.publicToken);
  const dayStart = startOfUtcDay(now);
  const cacheStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return db.$transaction(async (tx) => {
    const offer = await tx.seoAuditOffer.findUnique({
      where: { code: "free" },
      select: { id: true, pageLimit: true, publicFindingLimit: true },
    });
    if (!offer) {
      throw new SeoAuditEntitlementError("CONFIGURATION_ERROR");
    }

    await acquireAnonymousLimitLocks(tx, [
      "seo-audit:anonymous:global",
      `seo-audit:anonymous:ip:${requestIpHash}`,
      `seo-audit:anonymous:origin:${requestOriginHash}`,
      `seo-audit:anonymous:token:${publicTokenHash}`,
    ]);

    const tokenRun = await tx.seoAuditRun.findFirst({
      where: {
        publicTokenHash,
        status: { in: ["queued", "running", "cancel_requested"] },
      },
      select: { id: true },
    });
    if (tokenRun) {
      throw new SeoAuditEntitlementError("PUBLIC_TOKEN_ACTIVE");
    }

    const ipRuns = await tx.seoAuditRun.count({
      where: {
        kind: "free",
        requestIpHash,
        createdAt: { gte: dayStart },
      },
    });
    const originRuns = await tx.seoAuditRun.count({
      where: {
        kind: "free",
        requestOriginHash,
        createdAt: { gte: dayStart },
      },
    });
    const activeRuns = await tx.seoAuditRun.count({
      where: { status: { in: ["queued", "running"] } },
    });
    if (ipRuns >= 3) {
      throw new SeoAuditEntitlementError("IP_DAILY_LIMIT");
    }
    if (originRuns >= 5) {
      throw new SeoAuditEntitlementError("ORIGIN_DAILY_LIMIT");
    }
    if (activeRuns >= 50) {
      throw new SeoAuditEntitlementError("QUEUE_CAPACITY_REACHED");
    }

    const cached = await tx.seoAuditRun.findFirst({
      where: {
        kind: "free",
        status: "completed",
        requestOriginHash,
        engineVersion: input.engineVersion,
        completedAt: { gte: cacheStart },
        reportJsonKey: { not: null },
        reportMarkdownKey: { not: null },
        reportSha256: { not: null },
      },
      orderBy: { completedAt: "desc" },
      select: {
        summaryScore: true,
        summaryEvidenceCoverage: true,
        summaryPageCount: true,
        summaryCriticalCount: true,
        summaryHighCount: true,
        summaryMediumCount: true,
        summaryFindings: true,
        reportJsonKey: true,
        reportMarkdownKey: true,
        reportSha256: true,
      },
    });

    const commonData = {
      offerId: offer.id,
      status: cached ? ("completed" as const) : ("queued" as const),
      kind: "free" as const,
      targetUrl: target.targetUrl,
      normalizedOrigin: target.normalizedOrigin,
      requestIpHash,
      requestOriginHash,
      pageLimit: offer.pageLimit,
      totalTimeoutSeconds: 720,
      publicTokenHash,
      publicTokenExpiresAt: addDays(now, 1),
      availableAt: now,
      engineVersion: cached ? input.engineVersion : undefined,
    };
    const run = await tx.seoAuditRun.create({
      data: cached
        ? {
            ...commonData,
            completedAt: now,
            summaryScore: cached.summaryScore,
            summaryEvidenceCoverage: cached.summaryEvidenceCoverage,
            summaryPageCount: cached.summaryPageCount,
            summaryCriticalCount: cached.summaryCriticalCount,
            summaryHighCount: cached.summaryHighCount,
            summaryMediumCount: cached.summaryMediumCount,
            summaryFindings: sanitizeStoredSeoAuditPublicFindings(
              cached.summaryFindings,
            ),
            reportJsonKey: cached.reportJsonKey,
            reportMarkdownKey: cached.reportMarkdownKey,
            reportSha256: cached.reportSha256,
          }
        : commonData,
      select: { id: true },
    });
    return { runId: run.id, cached: Boolean(cached) };
  });
}

function nextScheduleAt(
  nextRunAt: Date,
  cadence: DueScheduleRow["cadence"],
  now: Date,
) {
  let candidate = new Date(nextRunAt);
  for (let index = 0; index < 120 && candidate <= now; index += 1) {
    if (cadence === "weekly") candidate = addDays(candidate, 7);
    else if (cadence === "biweekly") candidate = addDays(candidate, 14);
    else {
      const next = new Date(candidate);
      next.setUTCMonth(next.getUTCMonth() + 1);
      candidate = next;
    }
  }
  return candidate;
}

export async function enqueueDueSeoAuditSchedules(
  input: { limit?: number } = {},
  options: EntitlementOptions = {},
) {
  const db = options.db ?? prisma;
  const now = resolveNow(options.now);
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 20), 1), 50);

  return db.$transaction(async (tx) => {
    const dueSchedules = await tx.$queryRaw<DueScheduleRow[]>(Prisma.sql`
      SELECT
        schedules.id AS "scheduleId",
        subscriptions.id AS "subscriptionId",
        subscriptions.user_id AS "userId",
        subscriptions.project_id AS "projectId",
        subscriptions.offer_id AS "offerId",
        COALESCE(projects.display_url, projects.normalized_origin) AS "targetUrl",
        offers.page_limit AS "pageLimit",
        schedules.cadence AS "cadence",
        schedules.next_run_at AS "nextRunAt"
      FROM seo_audit_schedules AS schedules
      INNER JOIN seo_audit_subscriptions AS subscriptions
        ON subscriptions.id = schedules.subscription_id
      INNER JOIN seo_audit_projects AS projects
        ON projects.id = subscriptions.project_id
      INNER JOIN seo_audit_offers AS offers
        ON offers.id = subscriptions.offer_id
      WHERE schedules.enabled = TRUE
        AND schedules.next_run_at <= ${now}
        AND subscriptions.status = 'active'
        AND subscriptions.expires_at > ${now}
        AND subscriptions.scheduled_runs_used < subscriptions.max_scheduled_runs
      ORDER BY schedules.next_run_at ASC, schedules.created_at ASC
      LIMIT ${limit}
      FOR UPDATE OF schedules SKIP LOCKED
    `);

    let enqueued = 0;
    for (const schedule of dueSchedules) {
      const consumed = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        UPDATE seo_audit_subscriptions
        SET
          scheduled_runs_used = scheduled_runs_used + 1,
          updated_at = ${now}
        WHERE id = ${schedule.subscriptionId}
          AND status = 'active'
          AND expires_at > ${now}
          AND scheduled_runs_used < max_scheduled_runs
        RETURNING id
      `);
      if (!consumed[0]) continue;

      const target = normalizeSeoAuditTarget(schedule.targetUrl);
      await tx.seoAuditRun.create({
        data: {
          userId: schedule.userId,
          projectId: schedule.projectId,
          offerId: schedule.offerId,
          subscriptionId: schedule.subscriptionId,
          status: "queued",
          kind: "scheduled",
          targetUrl: target.targetUrl,
          normalizedOrigin: target.normalizedOrigin,
          pageLimit: schedule.pageLimit,
          totalTimeoutSeconds: 720,
          availableAt: now,
        },
        select: { id: true },
      });
      await tx.seoAuditSchedule.update({
        where: { id: schedule.scheduleId },
        data: {
          lastRunAt: now,
          nextRunAt: nextScheduleAt(
            schedule.nextRunAt,
            schedule.cadence,
            now,
          ),
        },
      });
      enqueued += 1;
    }
    return { enqueued };
  });
}
