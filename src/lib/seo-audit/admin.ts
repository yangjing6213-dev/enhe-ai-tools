import { Prisma } from "@prisma/client";
import {
  seoAuditFunnelSteps,
  type SeoAuditFunnelEventName,
} from "@/lib/analytics";
import {
  createAdminAuditCreateData,
  type AuditRequestContext,
} from "@/lib/admin-audit";
import { prisma } from "@/lib/db";
import { requestSeoAuditJobCancellation } from "@/lib/seo-audit/jobs";

const dashboardWindowDays = 30;
const expiringWindowDays = 7;

export type SeoAuditAdminErrorCode =
  | "SEO_AUDIT_RUN_NOT_FOUND"
  | "SEO_AUDIT_RETRY_NOT_ALLOWED"
  | "SEO_AUDIT_RUN_REFUNDED"
  | "SEO_AUDIT_CANCEL_NOT_ALLOWED"
  | "SEO_AUDIT_CANCEL_CONFLICT"
  | "SEO_AUDIT_SUBSCRIPTION_NOT_FOUND"
  | "SEO_AUDIT_SCHEDULE_NOT_FOUND"
  | "SEO_AUDIT_SCHEDULE_PAUSE_NOT_ALLOWED";

export class SeoAuditAdminError extends Error {
  readonly code: SeoAuditAdminErrorCode;

  constructor(code: SeoAuditAdminErrorCode) {
    super(code);
    this.name = "SeoAuditAdminError";
    this.code = code;
  }
}

type AdminDb = typeof prisma;
type RequestCancellation = typeof requestSeoAuditJobCancellation;

type CommercialOrder = {
  id: string;
  amount: number | string | { toString(): string };
  orderStatus: string;
  isTestData: boolean;
  offer?: { id: string; code: string; name: string } | null;
  seoAuditOffer?: { id: string; code: string; name: string } | null;
  paymentTransaction?: {
    status: string;
    refundedAt: Date | null;
  } | null;
  refundRecords: Array<{
    status: string;
    amount?: number | string | { toString(): string };
  }>;
  seoAuditSubscriptionOrder?: {
    subscriptionId: string;
    refundedAt: Date | null;
  } | null;
};

type ExpiringSubscription = {
  status: string;
  expiresAt: Date;
};

export function getSeoAuditAdminFunnelEvents(): Record<
  "visit" | "run" | "pay",
  SeoAuditFunnelEventName
> {
  return {
    visit: seoAuditFunnelSteps[0],
    run: seoAuditFunnelSteps[1],
    pay: seoAuditFunnelSteps[5],
  };
}

export function calculateSeoAuditAdminRates(input: {
  terminalRuns: number;
  failedRuns: number;
  paidReportRuns: number;
  deliveredPaidReports: number;
}) {
  return {
    failureRate: percentage(input.failedRuns, input.terminalRuns),
    paidReportDeliveryRate: percentage(
      input.deliveredPaidReports,
      input.paidReportRuns,
    ),
  };
}

export function summarizeSeoAuditCommercialOrders(orders: CommercialOrder[]) {
  const productionOrders = orders.filter((order) => !order.isTestData);
  const grossOrders = productionOrders.filter((order) =>
    ["paid", "activated", "refunded"].includes(order.orderStatus),
  );
  const refundedOrders = grossOrders.filter(isRefundedOrder);
  const effectiveOrders = grossOrders.filter(isEffectiveRevenueOrder);
  const offerTotals = new Map<
    string,
    { offerId: string; code: string; name: string; orders: number; revenue: number }
  >();
  const subscriptionOrderCounts = new Map<string, number>();

  for (const order of effectiveOrders) {
    const amount = numericAmount(order.amount);
    const offer = order.offer ?? order.seoAuditOffer;
    if (offer) {
      const current = offerTotals.get(offer.id) ?? {
        offerId: offer.id,
        code: offer.code,
        name: offer.name,
        orders: 0,
        revenue: 0,
      };
      current.orders += 1;
      current.revenue = roundMoney(current.revenue + amount);
      offerTotals.set(offer.id, current);
    }
    const subscriptionOrder = order.seoAuditSubscriptionOrder;
    if (subscriptionOrder && !subscriptionOrder.refundedAt) {
      subscriptionOrderCounts.set(
        subscriptionOrder.subscriptionId,
        (subscriptionOrderCounts.get(subscriptionOrder.subscriptionId) ?? 0) + 1,
      );
    }
  }

  const monitoringOrders = Array.from(subscriptionOrderCounts.values()).reduce(
    (total, count) => total + count,
    0,
  );
  const renewalCount = Array.from(subscriptionOrderCounts.values()).reduce(
    (total, count) => total + Math.max(0, count - 1),
    0,
  );

  return {
    effectiveRevenue: roundMoney(
      effectiveOrders.reduce((total, order) => total + numericAmount(order.amount), 0),
    ),
    effectiveOrderCount: effectiveOrders.length,
    refundAmount: roundMoney(
      refundedOrders.reduce((total, order) => total + refundedAmount(order), 0),
    ),
    refundCount: refundedOrders.length,
    refundRate: percentage(refundedOrders.length, grossOrders.length),
    renewalCount,
    renewalRate: percentage(renewalCount, monitoringOrders),
    offerMix: Array.from(offerTotals.values()).sort(
      (left, right) => right.orders - left.orders || right.revenue - left.revenue,
    ),
  };
}

export function findExpiringSeoAuditSubscriptions<T extends ExpiringSubscription>(
  subscriptions: T[],
  options: { now?: Date; windowDays?: number } = {},
) {
  const now = options.now ? new Date(options.now) : new Date();
  const windowDays = options.windowDays ?? expiringWindowDays;
  const windowEnd = new Date(now.getTime() + windowDays * 86_400_000);
  return subscriptions
    .filter(
      (subscription) =>
        (subscription.status === "active" || subscription.status === "paused") &&
        subscription.expiresAt.getTime() > now.getTime() &&
        subscription.expiresAt.getTime() <= windowEnd.getTime(),
    )
    .sort((left, right) => left.expiresAt.getTime() - right.expiresAt.getTime());
}

export async function retrySeoAuditRunForAdmin(input: {
  db: AdminDb;
  runId: string;
  adminId: string;
  auditContext?: AuditRequestContext;
  now?: Date;
}) {
  const now = input.now ? new Date(input.now) : new Date();
  return input.db.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`
      SELECT "id" FROM "seo_audit_runs" WHERE "id" = ${input.runId} FOR UPDATE
    `);
    const run = await tx.seoAuditRun.findUnique({
      where: { id: input.runId },
      select: {
        id: true,
        status: true,
        kind: true,
        attemptCount: true,
        failureCode: true,
        sourceOrder: {
          select: {
            orderStatus: true,
            paymentTransaction: { select: { status: true, refundedAt: true } },
            refundRecords: {
              where: { status: { in: ["pending", "completed"] } },
              select: { status: true },
            },
          },
        },
        credit: { select: { refundedAt: true } },
        subscription: { select: { status: true } },
      },
    });
    if (!run) throw new SeoAuditAdminError("SEO_AUDIT_RUN_NOT_FOUND");
    if (run.status !== "failed") {
      throw new SeoAuditAdminError("SEO_AUDIT_RETRY_NOT_ALLOWED");
    }
    if (runFundingWasRefunded(run)) {
      throw new SeoAuditAdminError("SEO_AUDIT_RUN_REFUNDED");
    }

    await tx.seoAuditRun.update({
      where: { id: run.id },
      data: {
        status: "queued",
        availableAt: now,
        attemptCount: 0,
        leaseTokenHash: null,
        leaseExpiresAt: null,
        cancelRequestedAt: null,
        startedAt: null,
        completedAt: null,
        failedAt: null,
        failureCode: null,
        failureMessage: null,
        engineVersion: null,
      },
    });
    await tx.adminAuditLog.create({
      data: createAdminAuditCreateData(
        {
          adminId: input.adminId,
          action: "seo_audit.run.retry",
          targetType: "seo_audit_run",
          targetId: run.id,
          summary: "Requeued a failed SEO audit run without changing entitlements.",
          metadata: {
            previousStatus: run.status,
            previousFailureCode: run.failureCode,
            previousAttemptCount: run.attemptCount,
            runKind: run.kind,
          },
        },
        input.auditContext,
      ),
    });

    return { status: "queued" as const };
  });
}

export async function cancelSeoAuditRunForAdmin(input: {
  db: AdminDb;
  runId: string;
  adminId: string;
  auditContext?: AuditRequestContext;
  now?: Date;
  requestCancellation?: RequestCancellation;
}) {
  const now = input.now ? new Date(input.now) : new Date();
  const requestCancellation =
    input.requestCancellation ?? requestSeoAuditJobCancellation;

  return input.db.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`
      SELECT "id" FROM "seo_audit_runs" WHERE "id" = ${input.runId} FOR UPDATE
    `);
    const run = await tx.seoAuditRun.findUnique({
      where: { id: input.runId },
      select: { id: true, status: true, kind: true },
    });
    if (!run) throw new SeoAuditAdminError("SEO_AUDIT_RUN_NOT_FOUND");
    if (run.status !== "queued" && run.status !== "running") {
      throw new SeoAuditAdminError("SEO_AUDIT_CANCEL_NOT_ALLOWED");
    }

    const outcome = await requestCancellation(run.id, {
      db: transactionScopedDb(tx),
      now,
    });
    if (outcome.status !== "cancelled" && outcome.status !== "cancel_requested") {
      throw new SeoAuditAdminError("SEO_AUDIT_CANCEL_CONFLICT");
    }

    await tx.adminAuditLog.create({
      data: createAdminAuditCreateData(
        {
          adminId: input.adminId,
          action: "seo_audit.run.cancel",
          targetType: "seo_audit_run",
          targetId: run.id,
          summary: "Requested cancellation of an active SEO audit run.",
          metadata: {
            previousStatus: run.status,
            resultStatus: outcome.status,
            runKind: run.kind,
          },
        },
        input.auditContext,
      ),
    });

    return outcome;
  });
}

export async function pauseSeoAuditScheduleForAdmin(input: {
  db: AdminDb;
  subscriptionId: string;
  adminId: string;
  auditContext?: AuditRequestContext;
}) {
  return input.db.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`
      SELECT "id" FROM "seo_audit_subscriptions"
      WHERE "id" = ${input.subscriptionId} FOR UPDATE
    `);
    const subscription = await tx.seoAuditSubscription.findUnique({
      where: { id: input.subscriptionId },
      select: {
        id: true,
        status: true,
        schedule: { select: { id: true, enabled: true, nextRunAt: true } },
      },
    });
    if (!subscription) {
      throw new SeoAuditAdminError("SEO_AUDIT_SUBSCRIPTION_NOT_FOUND");
    }
    if (subscription.status !== "active" && subscription.status !== "paused") {
      throw new SeoAuditAdminError("SEO_AUDIT_SCHEDULE_PAUSE_NOT_ALLOWED");
    }
    if (!subscription.schedule) {
      throw new SeoAuditAdminError("SEO_AUDIT_SCHEDULE_NOT_FOUND");
    }

    await tx.seoAuditSubscription.update({
      where: { id: subscription.id },
      data: { status: "paused" },
    });
    await tx.seoAuditSchedule.update({
      where: { subscriptionId: subscription.id },
      data: { enabled: false, nextRunAt: null },
    });
    await tx.adminAuditLog.create({
      data: createAdminAuditCreateData(
        {
          adminId: input.adminId,
          action: "seo_audit.schedule.pause",
          targetType: "seo_audit_subscription",
          targetId: subscription.id,
          summary: "Paused an SEO audit subscription and disabled its schedule.",
          metadata: {
            previousStatus: subscription.status,
            scheduleId: subscription.schedule.id,
            scheduleWasEnabled: subscription.schedule.enabled,
            scheduleHadNextRun: Boolean(subscription.schedule.nextRunAt),
          },
        },
        input.auditContext,
      ),
    });

    return {
      status: "paused" as const,
      scheduleId: subscription.schedule.id,
    };
  });
}

export async function getSeoAuditAdminDashboard(
  options: { db?: AdminDb; now?: Date } = {},
) {
  const db = options.db ?? prisma;
  const now = options.now ? new Date(options.now) : new Date();
  const windowStart = new Date(now.getTime() - dashboardWindowDays * 86_400_000);
  const expiringEnd = new Date(now.getTime() + expiringWindowDays * 86_400_000);
  const funnelEvents = getSeoAuditAdminFunnelEvents();
  const paidRunWhere: Prisma.SeoAuditRunWhereInput = {
    status: { in: ["completed", "failed"] },
    sourceOrder: {
      is: {
        orderStatus: { in: ["paid", "activated"] },
        isTestData: false,
        refundRecords: {
          none: { status: { in: ["pending", "completed"] } },
        },
      },
    },
  };

  const [
    funnelRows,
    commercialOrders,
    runStatusRows,
    paidReportRuns,
    deliveredPaidReports,
    workerHeartbeats,
    expiringSubscriptions,
    recentRuns,
  ] = await Promise.all([
    db.analyticsEvent.groupBy({
      by: ["eventName"],
      where: {
        createdAt: { gte: windowStart },
        eventName: { in: Object.values(funnelEvents) },
      },
      _count: { _all: true },
    }),
    db.order.findMany({
      where: {
        orderType: { in: ["seo_audit_credit", "seo_audit_monitoring"] },
        orderStatus: { in: ["paid", "activated", "refunded"] },
      },
      select: {
        id: true,
        amount: true,
        orderStatus: true,
        isTestData: true,
        seoAuditOffer: { select: { id: true, code: true, name: true } },
        paymentTransaction: { select: { status: true, refundedAt: true } },
        refundRecords: {
          where: { status: { in: ["pending", "completed"] } },
          select: { status: true, amount: true },
        },
        seoAuditSubscriptionOrder: {
          select: { subscriptionId: true, refundedAt: true },
        },
      },
    }),
    db.seoAuditRun.groupBy({
      by: ["status"],
      where: { createdAt: { gte: windowStart } },
      _count: { _all: true },
    }),
    db.seoAuditRun.count({ where: paidRunWhere }),
    db.seoAuditRun.count({
      where: {
        ...paidRunWhere,
        status: "completed",
        reportSha256: { not: null },
      },
    }),
    db.seoAuditWorkerHeartbeat.findMany({
      orderBy: { lastSeenAt: "desc" },
      take: 8,
      select: {
        id: true,
        workerId: true,
        engineVersion: true,
        status: true,
        currentRunId: true,
        lastSeenAt: true,
      },
    }),
    db.seoAuditSubscription.findMany({
      where: {
        status: { in: ["active", "paused"] },
        expiresAt: { gt: now, lte: expiringEnd },
      },
      orderBy: { expiresAt: "asc" },
      take: 30,
      select: {
        id: true,
        status: true,
        expiresAt: true,
        scheduledRunsUsed: true,
        maxScheduledRuns: true,
        user: { select: { id: true, email: true, phone: true } },
        offer: { select: { id: true, code: true, name: true } },
        project: { select: { normalizedOrigin: true } },
        schedule: {
          select: { id: true, enabled: true, cadence: true, nextRunAt: true },
        },
      },
    }),
    db.seoAuditRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        status: true,
        kind: true,
        normalizedOrigin: true,
        attemptCount: true,
        maxAttempts: true,
        failureCode: true,
        summaryScore: true,
        summaryPageCount: true,
        createdAt: true,
        updatedAt: true,
        startedAt: true,
        completedAt: true,
        failedAt: true,
        user: { select: { id: true, email: true, phone: true } },
        sourceOrder: {
          select: { id: true, orderNo: true, orderStatus: true, isTestData: true },
        },
        offer: { select: { id: true, code: true, name: true } },
        subscription: {
          select: { id: true, status: true, expiresAt: true },
        },
      },
    }),
  ]);

  const statusCounts = new Map(
    runStatusRows.map((row) => [row.status, row._count._all]),
  );
  const completedRuns = statusCounts.get("completed") ?? 0;
  const failedRuns = statusCounts.get("failed") ?? 0;
  const rates = calculateSeoAuditAdminRates({
    terminalRuns: completedRuns + failedRuns,
    failedRuns,
    paidReportRuns,
    deliveredPaidReports,
  });

  return {
    windowDays: dashboardWindowDays,
    funnel: buildAdminFunnel(funnelRows, funnelEvents),
    commercial: summarizeSeoAuditCommercialOrders(commercialOrders),
    operations: {
      queuedRuns: statusCounts.get("queued") ?? 0,
      runningRuns:
        (statusCounts.get("running") ?? 0) +
        (statusCounts.get("cancel_requested") ?? 0),
      completedRuns,
      failedRuns,
      ...rates,
    },
    workerHeartbeats: workerHeartbeats.map((heartbeat) => ({
      ...heartbeat,
      healthy: heartbeat.lastSeenAt.getTime() >= now.getTime() - 2 * 60_000,
    })),
    expiringSubscriptions,
    recentRuns,
  };
}

export async function getSeoAuditAdminRunDetail(
  runId: string,
  options: { db?: AdminDb } = {},
) {
  const db = options.db ?? prisma;
  const run = await db.seoAuditRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      status: true,
      kind: true,
      normalizedOrigin: true,
      pageLimit: true,
      totalTimeoutSeconds: true,
      attemptCount: true,
      maxAttempts: true,
      availableAt: true,
      cancelRequestedAt: true,
      startedAt: true,
      completedAt: true,
      failedAt: true,
      failureCode: true,
      failureMessage: true,
      engineVersion: true,
      summaryScore: true,
      summaryEvidenceCoverage: true,
      summaryPageCount: true,
      summaryCriticalCount: true,
      summaryHighCount: true,
      summaryMediumCount: true,
      summaryFindings: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, email: true, phone: true, nickname: true } },
      project: { select: { id: true, normalizedOrigin: true } },
      offer: { select: { id: true, code: true, name: true } },
      sourceOrder: {
        select: {
          id: true,
          orderNo: true,
          orderType: true,
          orderStatus: true,
          amount: true,
          isTestData: true,
        },
      },
      credit: {
        select: {
          id: true,
          totalRuns: true,
          remainingRuns: true,
          expiresAt: true,
          refundedAt: true,
        },
      },
      subscription: {
        select: {
          id: true,
          status: true,
          startsAt: true,
          expiresAt: true,
          maxScheduledRuns: true,
          scheduledRunsUsed: true,
          manualRunsRemaining: true,
          offer: { select: { id: true, code: true, name: true } },
          schedule: {
            select: {
              id: true,
              cadence: true,
              enabled: true,
              nextRunAt: true,
              lastRunAt: true,
            },
          },
        },
      },
    },
  });
  if (!run) return null;

  const { summaryFindings, failureCode, failureMessage, ...safeRun } = run;
  return {
    ...safeRun,
    failure: classifySeoAuditFailure(failureCode, failureMessage),
    publicFindings: extractPublicFindings(summaryFindings),
  };
}

function buildAdminFunnel(
  rows: Array<{ eventName: string; _count: { _all: number } }>,
  events: ReturnType<typeof getSeoAuditAdminFunnelEvents>,
) {
  const counts = new Map(rows.map((row) => [row.eventName, row._count._all]));
  const stages = (["visit", "run", "pay"] as const).map((stage) => ({
    stage,
    eventName: events[stage],
    count: counts.get(events[stage]) ?? 0,
  }));
  return stages.map((stage, index) => ({
    ...stage,
    conversionRate:
      index === 0
        ? stage.count > 0
          ? 100
          : 0
        : percentage(stage.count, stages[index - 1].count),
  }));
}

function isEffectiveRevenueOrder(order: CommercialOrder) {
  return (
    (order.orderStatus === "paid" || order.orderStatus === "activated") &&
    !isRefundedOrder(order) &&
    !order.refundRecords.some(
      (refund) => refund.status === "pending" || refund.status === "completed",
    )
  );
}

function isRefundedOrder(order: CommercialOrder) {
  return (
    order.orderStatus === "refunded" ||
    order.paymentTransaction?.status === "refunded" ||
    Boolean(order.paymentTransaction?.refundedAt) ||
    order.refundRecords.some((refund) => refund.status === "completed")
  );
}

function refundedAmount(order: CommercialOrder) {
  const completedRefunds = order.refundRecords.filter(
    (refund) => refund.status === "completed",
  );
  if (completedRefunds.length === 0) return numericAmount(order.amount);
  return completedRefunds.reduce(
    (total, refund) => total + numericAmount(refund.amount ?? order.amount),
    0,
  );
}

function runFundingWasRefunded(run: {
  sourceOrder: {
    orderStatus: string;
    paymentTransaction: { status: string; refundedAt: Date | null } | null;
    refundRecords: Array<{ status: string }>;
  } | null;
  credit: { refundedAt: Date | null } | null;
  subscription: { status: string } | null;
}) {
  return Boolean(
    run.sourceOrder?.orderStatus === "refunded" ||
      run.sourceOrder?.paymentTransaction?.status === "refunded" ||
      run.sourceOrder?.paymentTransaction?.refundedAt ||
      run.sourceOrder?.refundRecords.some(
        (refund) => refund.status === "pending" || refund.status === "completed",
      ) ||
      run.credit?.refundedAt ||
      run.subscription?.status === "refunded",
  );
}

function transactionScopedDb(tx: Prisma.TransactionClient) {
  return {
    $transaction: async <T>(
      callback: (client: Prisma.TransactionClient) => Promise<T>,
    ) => callback(tx),
  } as unknown as AdminDb;
}

function classifySeoAuditFailure(code: string | null, message: string | null) {
  if (!code && !message) return null;
  let category = "unknown";
  if (code === "INVALID_TARGET" || code === "ROBOTS_BLOCKED") {
    category = "target";
  } else if (code === "MAX_ATTEMPTS_EXCEEDED") {
    category = "attempt_limit";
  } else if (code?.startsWith("SYSTEM_") || code?.startsWith("ARTIFACT_")) {
    category = "system";
  }
  return {
    code: code ?? "UNCLASSIFIED",
    category,
    message: redactUrls(message ?? "No failure message recorded."),
  };
}

function extractPublicFindings(value: Prisma.JsonValue | null) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const finding = item as Record<string, Prisma.JsonValue>;
    const text = firstString(finding.issue, finding.title, finding.summary);
    if (!text) return [];
    return [
      {
        id: firstString(finding.id) ?? `finding-${index + 1}`,
        code: firstString(finding.code) ?? "unclassified",
        severity: firstString(finding.severity) ?? "unknown",
        summary: redactUrls(text),
      },
    ];
  });
}

function firstString(...values: Prisma.JsonValue[]) {
  return values.find((value): value is string => typeof value === "string")?.trim();
}

function redactUrls(value: string) {
  return value
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function numericAmount(value: number | string | { toString(): string }) {
  const amount = Number(typeof value === "number" ? value : value.toString());
  return Number.isFinite(amount) ? amount : 0;
}

function percentage(numerator: number, denominator: number) {
  if (denominator <= 0 || numerator <= 0) return 0;
  return Math.round((numerator / denominator) * 1_000) / 10;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
