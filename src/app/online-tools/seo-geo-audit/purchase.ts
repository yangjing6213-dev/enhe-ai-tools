import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { resolveSeoAuditRunAccess } from "@/lib/seo-audit/public-access";

type PurchasableSourceRunRecord = {
  id: string;
  userId: string | null;
  status: string;
  kind: string;
  normalizedOrigin: string;
  publicTokenHash: string | null;
  publicTokenExpiresAt: Date | null;
};

type PurchaseDatabase = {
  seoAuditRun: {
    findUnique(args: {
      where: { id: string };
      select: Record<keyof PurchasableSourceRunRecord, true>;
    }): Promise<PurchasableSourceRunRecord | null>;
    updateMany(args: {
      where: {
        id: string;
        userId: null;
        status: "completed";
        kind: "free";
        publicTokenHash: string;
        publicTokenExpiresAt: { gt: Date };
      };
      data: {
        userId: string;
        publicTokenHash: null;
        publicTokenExpiresAt: null;
      };
    }): Promise<{ count: number }>;
  };
};

type MonitoringPurchaseDatabase = {
  seoAuditRun: {
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        userId: true;
        status: true;
        normalizedOrigin: true;
      };
    }): Promise<{
      id: string;
      userId: string | null;
      status: string;
      normalizedOrigin: string;
    } | null>;
  };
  seoAuditSubscription: {
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        userId: true;
        status: true;
        project: { select: { normalizedOrigin: true } };
      };
    }): Promise<{
      id: string;
      userId: string;
      status: string;
      project: { normalizedOrigin: string };
    } | null>;
  };
};

export type SeoAuditOrderCreateData = {
  orderNo: string;
  userId: string;
  seoAuditOfferId: string;
  seoAuditTargetOrigin: string;
  seoAuditSourceRunId: string | null;
  orderType: "seo_audit_credit" | "seo_audit_monitoring";
  amount: string;
  paymentMethod: "alipay" | "wechat";
  orderStatus: "pending_payment";
};

type PendingOrderWhere = {
  userId: string;
  seoAuditOfferId: string;
  seoAuditTargetOrigin: string;
  seoAuditSourceRunId?: string;
  orderType: "seo_audit_credit" | "seo_audit_monitoring";
  orderStatus: "pending_payment";
  paymentMethod: "alipay" | "wechat";
};

type PendingOrderTransaction = {
  $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>;
  order: {
    findFirst(args: {
      where: PendingOrderWhere;
      orderBy: { createdAt: "desc" };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: SeoAuditOrderCreateData;
      select: { id: true };
    }): Promise<{ id: string }>;
  };
};

type PendingOrderDatabase = {
  $transaction<T>(
    callback: (transaction: PendingOrderTransaction) => Promise<T>,
  ): Promise<T>;
};

const purchaseSchema = z.object({
  offerCode: z.enum(["professional", "deep"]),
  sourceRunId: z.string().trim().min(1).max(128),
  publicToken: z.union([z.string().regex(/^[^\s]{24,512}$/), z.literal("")]),
  paymentMethod: z.enum(["alipay", "wechat"]),
  locale: z.enum(["zh", "en"]),
  csrfToken: z.string().min(1).max(512),
});

const monitoringPurchaseSchema = z.object({
  sourceType: z.enum(["run", "subscription"]),
  sourceId: z.string().trim().regex(/^[A-Za-z0-9_-]{1,128}$/),
  paymentMethod: z.enum(["alipay", "wechat"]),
  locale: z.enum(["zh", "en"]),
  csrfToken: z.string().min(1).max(512),
});

export function parseSeoAuditPurchaseForm(formData: FormData) {
  return purchaseSchema.parse({
    offerCode: formData.get("offerCode"),
    sourceRunId: formData.get("sourceRunId"),
    publicToken: formData.get("publicToken"),
    paymentMethod: formData.get("paymentMethod"),
    locale: formData.get("locale"),
    csrfToken: formData.get("csrfToken"),
  });
}

export function parseSeoAuditMonitoringPurchaseForm(formData: FormData) {
  return monitoringPurchaseSchema.parse({
    sourceType: formData.get("sourceType"),
    sourceId: formData.get("sourceId"),
    paymentMethod: formData.get("paymentMethod"),
    locale: formData.get("locale"),
    csrfToken: formData.get("csrfToken"),
  });
}

export function buildSeoAuditOrderCreateData(input: {
  orderNo: string;
  userId: string;
  sourceRun: { id: string; normalizedOrigin: string };
  offer: {
    id: string;
    orderType: "seo_audit_credit";
    price: string;
  };
  paymentMethod: "alipay" | "wechat";
}): SeoAuditOrderCreateData {
  return {
    orderNo: input.orderNo,
    userId: input.userId,
    seoAuditOfferId: input.offer.id,
    seoAuditTargetOrigin: input.sourceRun.normalizedOrigin,
    seoAuditSourceRunId: input.sourceRun.id,
    orderType: input.offer.orderType,
    amount: input.offer.price,
    paymentMethod: input.paymentMethod,
    orderStatus: "pending_payment" as const,
  };
}

export function buildSeoAuditMonitoringOrderCreateData(input: {
  orderNo: string;
  userId: string;
  source: { normalizedOrigin: string; sourceRunId: string | null };
  offer: {
    id: string;
    orderType: "seo_audit_monitoring";
    price: string;
  };
  paymentMethod: "alipay" | "wechat";
}): SeoAuditOrderCreateData {
  return {
    orderNo: input.orderNo,
    userId: input.userId,
    seoAuditOfferId: input.offer.id,
    seoAuditTargetOrigin: input.source.normalizedOrigin,
    seoAuditSourceRunId: input.source.sourceRunId,
    orderType: input.offer.orderType,
    amount: input.offer.price,
    paymentMethod: input.paymentMethod,
    orderStatus: "pending_payment",
  };
}

const purchasableSourceRunSelect: Record<
  keyof PurchasableSourceRunRecord,
  true
> = {
  id: true,
  userId: true,
  status: true,
  kind: true,
  normalizedOrigin: true,
  publicTokenHash: true,
  publicTokenExpiresAt: true,
};

export async function loadPurchasableSeoAuditSourceRun(
  input: {
    runId: string;
    userId: string;
    publicToken: string | null | undefined;
  },
  options: { db?: PurchaseDatabase; now?: Date } = {},
) {
  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.runId) ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.userId)
  ) {
    throw new Error("SEO_AUDIT_SOURCE_RUN_UNAVAILABLE");
  }
  const db = options.db ?? (prisma as unknown as PurchaseDatabase);
  const now = options.now ?? new Date();
  const readRun = () => db.seoAuditRun.findUnique({
    where: { id: input.runId },
    select: purchasableSourceRunSelect,
  });
  const run = await readRun();

  if (!run || run.status !== "completed" || run.kind !== "free") {
    throw new Error("SEO_AUDIT_SOURCE_RUN_UNAVAILABLE");
  }
  if (run.userId === input.userId) {
    return { id: run.id, normalizedOrigin: run.normalizedOrigin };
  }
  if (run.userId !== null) {
    throw new Error("SEO_AUDIT_SOURCE_RUN_UNAVAILABLE");
  }

  const access = resolveSeoAuditRunAccess(run, {
    userId: input.userId,
    token: input.publicToken,
    now,
  });
  if (access !== "anonymous" || !run.publicTokenHash) {
    throw new Error("SEO_AUDIT_SOURCE_RUN_UNAVAILABLE");
  }

  const claimed = await db.seoAuditRun.updateMany({
    where: {
      id: run.id,
      userId: null,
      status: "completed",
      kind: "free",
      publicTokenHash: run.publicTokenHash,
      publicTokenExpiresAt: { gt: now },
    },
    data: {
      userId: input.userId,
      publicTokenHash: null,
      publicTokenExpiresAt: null,
    },
  });
  if (claimed.count !== 1) {
    const ownerRun = await readRun();
    if (
      !ownerRun ||
      ownerRun.userId !== input.userId ||
      ownerRun.status !== "completed" ||
      ownerRun.kind !== "free"
    ) {
      throw new Error("SEO_AUDIT_SOURCE_RUN_UNAVAILABLE");
    }
    return { id: ownerRun.id, normalizedOrigin: ownerRun.normalizedOrigin };
  }

  return { id: run.id, normalizedOrigin: run.normalizedOrigin };
}

export async function loadSeoAuditMonitoringPurchaseSource(
  input: {
    sourceType: "run" | "subscription";
    sourceId: string;
    userId: string;
  },
  options: { db?: MonitoringPurchaseDatabase } = {},
) {
  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.sourceId) ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.userId)
  ) {
    throw new Error("SEO_AUDIT_MONITORING_SOURCE_UNAVAILABLE");
  }
  const db = options.db ?? (prisma as unknown as MonitoringPurchaseDatabase);

  if (input.sourceType === "run") {
    const run = await db.seoAuditRun.findUnique({
      where: { id: input.sourceId },
      select: {
        id: true,
        userId: true,
        status: true,
        normalizedOrigin: true,
      },
    });
    if (
      !run ||
      run.userId !== input.userId ||
      run.status !== "completed"
    ) {
      throw new Error("SEO_AUDIT_MONITORING_SOURCE_UNAVAILABLE");
    }
    return {
      normalizedOrigin: run.normalizedOrigin,
      sourceRunId: run.id,
    };
  }

  const subscription = await db.seoAuditSubscription.findUnique({
    where: { id: input.sourceId },
    select: {
      id: true,
      userId: true,
      status: true,
      project: { select: { normalizedOrigin: true } },
    },
  });
  if (
    !subscription ||
    subscription.userId !== input.userId ||
    subscription.status === "refunded"
  ) {
    throw new Error("SEO_AUDIT_MONITORING_SOURCE_UNAVAILABLE");
  }
  return {
    normalizedOrigin: subscription.project.normalizedOrigin,
    sourceRunId: null,
  };
}

export async function createOrReusePendingSeoAuditOrder(
  data: SeoAuditOrderCreateData,
  options: { db?: PendingOrderDatabase } = {},
) {
  const db = options.db ?? (prisma as unknown as PendingOrderDatabase);
  const sourceKey =
    data.orderType === "seo_audit_credit"
      ? data.seoAuditSourceRunId ?? "missing-source"
      : data.seoAuditTargetOrigin;
  const lockKey = [
    "seo-audit-order",
    data.userId,
    data.seoAuditOfferId,
    data.orderType,
    sourceKey,
    data.paymentMethod,
  ].join(":");

  return db.$transaction(async (transaction) => {
    await transaction.$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0)) IS NULL AS "lockAcquired"`,
    );
    const where: PendingOrderWhere = {
      userId: data.userId,
      seoAuditOfferId: data.seoAuditOfferId,
      seoAuditTargetOrigin: data.seoAuditTargetOrigin,
      orderType: data.orderType,
      orderStatus: "pending_payment",
      paymentMethod: data.paymentMethod,
    };
    if (
      data.orderType === "seo_audit_credit" &&
      data.seoAuditSourceRunId
    ) {
      where.seoAuditSourceRunId = data.seoAuditSourceRunId;
    }

    const existing = await transaction.order.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existing) return { id: existing.id, reused: true };

    const created = await transaction.order.create({
      data,
      select: { id: true },
    });
    return { id: created.id, reused: false };
  });
}
