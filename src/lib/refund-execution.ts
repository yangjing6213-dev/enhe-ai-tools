import {
  Prisma,
  type PaymentRefundState,
  type PrismaClient,
  type RefundStatus,
} from "@prisma/client";
import { createAdminAuditCreateData } from "@/lib/admin-audit";
import { prisma } from "@/lib/db";
import {
  assertRefundEntitlementRevocationIsSafe,
  lockVipEntitlementUser,
  revokeEntitlementsForRefundedOrder,
  VIP_REFUND_RECONCILIATION_REQUIRED,
} from "@/lib/membership";
import {
  requestZpayRefund,
  type ZpayRefundResult,
} from "@/lib/zpay-orders";
import { isLatePaymentAfterLocalRefund } from "@/lib/refund-reconciliation";
import { truncateUtf8 } from "@/lib/zpay";
import { consumeZpayRefundConfirmation } from "@/lib/zpay-config";

const refundTransitions: Record<PaymentRefundState, readonly PaymentRefundState[]> = {
  requested: ["dispatching"],
  dispatching: ["provider_succeeded", "provider_rejected", "ambiguous"],
  provider_succeeded: ["finalized", "finalize_retry"],
  finalized: [],
  finalize_retry: ["finalized"],
  provider_rejected: [],
  ambiguous: ["provider_succeeded", "provider_rejected"],
};

export function canTransitionPaymentRefundState(
  from: PaymentRefundState | null,
  to: PaymentRefundState,
) {
  if (from === null) return to === "requested";
  return refundTransitions[from].includes(to);
}

export function getRefundReviewStatusForPaymentState(
  state: PaymentRefundState,
): RefundStatus {
  if (state === "finalized") return "completed";
  if (state === "provider_rejected") return "rejected";
  return "pending";
}

export function sanitizeRefundErrorDetail(value: string | null | undefined) {
  const normalized = value?.replace(/[\r\n]+/g, " ").trim() ?? "";
  return normalized ? truncateUtf8(normalized, 256) : null;
}

type RefundDatabase = PrismaClient;
type ProviderRefund = typeof requestZpayRefund;

export const zpayRefundDispatchStaleAfterMs = 15 * 60 * 1000;

type RefundExecutionDependencies = {
  db?: RefundDatabase;
  providerRefund?: ProviderRefund;
  consumeConfirmation?: typeof consumeZpayRefundConfirmation;
  now?: () => Date;
};

export type RefundExecutionOutcome =
  | "finalized"
  | "finalize_retry"
  | "provider_rejected"
  | "ambiguous"
  | "already_processing";

export type RefundExecutionResult = {
  outcome: RefundExecutionOutcome;
};

export type RefundTerminalTransitionResult = RefundExecutionResult & {
  changed: boolean;
};

export type RefundExecutionInput = {
  refundId: string;
  adminId: string;
  note?: string | null;
  refundProofImage?: string | null;
  refundConfirmation?: string | null;
  providerRefundReference?: string | null;
};

type ClaimedRefund = {
  paymentId: string;
  refundId: string;
  orderId: string;
  orderNo: string;
  amount: string;
};

function toRefundPayload(result: Extract<ZpayRefundResult, { kind: "succeeded" | "rejected" }>) {
  return JSON.parse(JSON.stringify(result.payload)) as Prisma.InputJsonValue;
}

function getManualProviderRefundEvidence(
  input: RefundExecutionInput,
  refund: Awaited<ReturnType<typeof getRefundForExecution>>,
  now: Date,
) {
  const providerRefundReference = input.providerRefundReference?.trim() ?? "";
  if (!providerRefundReference) throw new Error("REFUND_PROVIDER_REFERENCE_REQUIRED");
  const providerRefundReferenceBytes = Buffer.byteLength(providerRefundReference, "utf8");
  if (
    providerRefundReferenceBytes < 6 ||
    providerRefundReferenceBytes > 128 ||
    /\s/u.test(providerRefundReference)
  ) {
    throw new Error("REFUND_PROVIDER_REFERENCE_INVALID");
  }

  const refundProofImage = input.refundProofImage?.trim() ?? "";
  if (!refundProofImage) throw new Error("REFUND_PROOF_REQUIRED");
  let proofUrl: URL | null = null;
  try {
    proofUrl = new URL(refundProofImage);
  } catch {
    proofUrl = null;
  }
  if (
    Buffer.byteLength(refundProofImage, "utf8") > 2048 ||
    (!refundProofImage.startsWith("/uploads/") && proofUrl?.protocol !== "https:")
  ) {
    throw new Error("REFUND_PROOF_INVALID");
  }

  const payment = refund.order.paymentTransaction;
  if (!payment || !payment.amount.equals(refund.amount)) {
    throw new Error("REFUND_STATE_MISMATCH");
  }
  const payload = JSON.parse(JSON.stringify({
    kind: "manual-provider-refund-confirmation",
    provider: "zpay",
    providerRefundReference,
    amount: refund.amount.toFixed(2),
    confirmedAt: now.toISOString(),
    refundProofImage,
    ...(payment.providerTradeNo
      ? { providerPaymentTradeNo: payment.providerTradeNo }
      : {}),
  })) as Prisma.InputJsonValue;

  return { providerRefundReference, refundProofImage, payload };
}

function isRefundProviderReferenceUniqueConflict(error: unknown) {
  const isUniqueConflict =
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") ||
    (typeof error === "object" && error !== null && "code" in error && error.code === "P2002");
  if (!isUniqueConflict) return false;

  const meta = typeof error === "object" && error !== null && "meta" in error
    ? error.meta
    : null;
  const target = typeof meta === "object" && meta !== null && "target" in meta
    ? meta.target
    : null;
  const normalizedTarget = Array.isArray(target)
    ? target.map(String).join(",")
    : String(target ?? "");
  return normalizedTarget.includes("refundProviderReference")
    || normalizedTarget.includes("refund_provider_reference");
}

function outcomeForStoredState(state: PaymentRefundState | null): RefundExecutionResult {
  switch (state) {
    case "finalized":
      return { outcome: "finalized" };
    case "provider_rejected":
      return { outcome: "provider_rejected" };
    case "ambiguous":
      return { outcome: "ambiguous" };
    case "provider_succeeded":
    case "finalize_retry":
      return { outcome: "finalize_retry" };
    case "requested":
    case "dispatching":
    case null:
      return { outcome: "already_processing" };
  }
}

async function getRefundForExecution(
  tx: Prisma.TransactionClient,
  refundId: string,
) {
  const refund = await tx.orderRefundRecord.findUnique({
    where: { id: refundId },
    include: {
      order: {
        include: { paymentTransaction: true },
      },
    },
  });
  if (!refund) throw new Error("REFUND_NOT_FOUND");
  if (!refund.order.paymentTransaction) throw new Error("REFUND_PAYMENT_NOT_FOUND");
  return refund;
}

function assertRefundCanDispatch(
  refund: Awaited<ReturnType<typeof getRefundForExecution>>,
) {
  const { order } = refund;
  const payment = order.paymentTransaction;
  if (!payment) throw new Error("REFUND_PAYMENT_NOT_FOUND");
  if (refund.status !== "pending") throw new Error("REFUND_NOT_PENDING");
  if (payment.provider !== "zpay") throw new Error("REFUND_PROVIDER_UNSUPPORTED");
  if (payment.status !== "paid") throw new Error("REFUND_PAYMENT_NOT_PAID");
  if (order.orderStatus !== "paid" && order.orderStatus !== "activated") {
    throw new Error("REFUND_ORDER_NOT_PAID");
  }
  if (!refund.amount.equals(order.amount) || !payment.amount.equals(order.amount)) {
    throw new Error("REFUND_REQUIRES_FULL_ORDER_AMOUNT");
  }
  if (payment.refundRecordId && payment.refundRecordId !== refund.id) {
    throw new Error("REFUND_PAYMENT_ALREADY_BOUND");
  }
}

async function claimRefundDispatch(
  input: RefundExecutionInput,
  db: RefundDatabase,
  now: Date,
): Promise<ClaimedRefund | RefundExecutionResult> {
  return db.$transaction(async (tx) => {
    const refundReference = await tx.orderRefundRecord.findUnique({
      where: { id: input.refundId },
      select: {
        orderId: true,
        order: { select: { orderType: true, userId: true } },
      },
    });
    if (!refundReference) throw new Error("REFUND_NOT_FOUND");
    if (refundReference.order.orderType === "vip") {
      await lockVipEntitlementUser(tx, refundReference.order.userId);
    }

    const orderRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM orders WHERE id = ${refundReference.orderId} FOR UPDATE
    `);
    if (orderRows.length !== 1) throw new Error("REFUND_ORDER_NOT_FOUND");
    const paymentRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM payment_transactions WHERE order_id = ${refundReference.orderId} FOR UPDATE
    `);
    if (paymentRows.length !== 1) throw new Error("REFUND_PAYMENT_NOT_FOUND");
    const refundRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM order_refund_records WHERE id = ${input.refundId} FOR UPDATE
    `);
    if (refundRows.length !== 1) throw new Error("REFUND_NOT_FOUND");

    let refund = await getRefundForExecution(tx, input.refundId);
    let payment = refund.order.paymentTransaction;
    if (!payment) throw new Error("REFUND_PAYMENT_NOT_FOUND");
    if (payment.refundRecordId && payment.refundRecordId !== refund.id) {
      throw new Error("REFUND_PAYMENT_ALREADY_BOUND");
    }

    if (payment.refundState === "provider_succeeded" || payment.refundState === "finalize_retry") {
      return { outcome: "finalize_retry" };
    }
    if (payment.refundState !== null && payment.refundState !== "requested") {
      return outcomeForStoredState(payment.refundState);
    }

    assertRefundCanDispatch(refund);
    await assertRefundEntitlementRevocationIsSafe(tx, refund.order);

    if (payment.refundState === null) {
      const requested = await tx.paymentTransaction.updateMany({
        where: {
          id: payment.id,
          refundState: null,
          refundDispatchCount: 0,
        },
        data: {
          refundState: "requested",
          refundRecordId: refund.id,
          refundRequestedAt: now,
          refundLastErrorCode: null,
          refundLastErrorDetail: null,
        },
      });
      if (requested.count !== 1) {
        payment = await tx.paymentTransaction.findUniqueOrThrow({ where: { id: payment.id } });
        return outcomeForStoredState(payment.refundState);
      }
      refund = await getRefundForExecution(tx, input.refundId);
      payment = refund.order.paymentTransaction;
      if (!payment) throw new Error("REFUND_PAYMENT_NOT_FOUND");
    }

    assertRefundCanDispatch(refund);

    const claimed = await tx.paymentTransaction.updateMany({
      where: {
        id: payment.id,
        refundState: "requested",
        refundRecordId: refund.id,
        refundDispatchCount: 0,
      },
      data: {
        refundState: "dispatching",
        refundDispatchCount: { increment: 1 },
        refundDispatchStartedAt: now,
      },
    });
    if (claimed.count !== 1) {
      payment = await tx.paymentTransaction.findUniqueOrThrow({ where: { id: payment.id } });
      return outcomeForStoredState(payment.refundState);
    }

    await tx.orderRefundRecord.update({
      where: { id: refund.id },
      data: {
        adminId: input.adminId,
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...(input.refundProofImage !== undefined
          ? { refundProofImage: input.refundProofImage }
          : {}),
      },
    });

    return {
      paymentId: payment.id,
      refundId: refund.id,
      orderId: refund.order.id,
      orderNo: refund.order.orderNo,
      amount: refund.order.amount.toFixed(2),
    };
  });
}

async function persistProviderResult(
  claim: ClaimedRefund,
  adminId: string,
  result: ZpayRefundResult,
  db: RefundDatabase,
  now: Date,
) {
  const nextState: PaymentRefundState =
    result.kind === "succeeded"
      ? "provider_succeeded"
      : result.kind === "rejected"
        ? "provider_rejected"
        : "ambiguous";

  return db.$transaction(async (tx) => {
    const updated = await tx.paymentTransaction.updateMany({
      where: {
        id: claim.paymentId,
        refundRecordId: claim.refundId,
        refundState: "dispatching",
      },
      data: {
        refundState: nextState,
        refundProviderRespondedAt: now,
        refundPayload:
          result.kind === "ambiguous" ? Prisma.JsonNull : toRefundPayload(result),
        refundLastErrorCode:
          result.kind === "ambiguous"
            ? result.errorCode
            : result.kind === "rejected"
              ? `provider-${result.providerCode}`
              : null,
        refundLastErrorDetail:
          result.kind === "ambiguous"
            ? sanitizeRefundErrorDetail(result.detail)
            : result.kind === "rejected"
              ? sanitizeRefundErrorDetail(result.message)
              : null,
      },
    });
    if (updated.count !== 1) {
      const current = await tx.paymentTransaction.findUniqueOrThrow({
        where: { id: claim.paymentId },
        select: { refundState: true },
      });
      return { ...outcomeForStoredState(current.refundState), changed: false };
    }

    await tx.orderRefundRecord.update({
      where: { id: claim.refundId },
      data: {
        adminId,
        status: getRefundReviewStatusForPaymentState(nextState),
        completedAt: null,
      },
    });
    await tx.adminAuditLog.create({
      data: createAdminAuditCreateData({
        adminId,
        action: `order.refund.${nextState}`,
        targetType: "order",
        targetId: claim.orderId,
        summary: `Refund ${claim.refundId} moved to ${nextState}.`,
        metadata: {
          refundId: claim.refundId,
          paymentTransactionId: claim.paymentId,
          refundState: nextState,
          ...(result.kind === "ambiguous"
            ? { errorCode: result.errorCode }
            : { providerCode: result.providerCode }),
        },
      }),
    });
    return { ...outcomeForStoredState(nextState), changed: true };
  });
}

async function recordFinalizeRetry(
  input: RefundExecutionInput,
  db: RefundDatabase,
  now: Date,
) {
  return db.$transaction(async (tx) => {
    const refund = await getRefundForExecution(tx, input.refundId);
    const payment = refund.order.paymentTransaction;
    if (!payment) throw new Error("REFUND_PAYMENT_NOT_FOUND");
    if (payment.refundState === "finalized") return { outcome: "finalized" } as const;
    if (payment.refundState !== "provider_succeeded" && payment.refundState !== "finalize_retry") {
      return outcomeForStoredState(payment.refundState);
    }

    const updated = await tx.paymentTransaction.updateMany({
      where: {
        id: payment.id,
        refundState: { in: ["provider_succeeded", "finalize_retry"] },
      },
      data: {
        refundState: "finalize_retry",
        refundLastErrorCode: "local-finalization-failed",
        refundLastErrorDetail: null,
      },
    });
    if (updated.count !== 1) {
      const current = await tx.paymentTransaction.findUniqueOrThrow({
        where: { id: payment.id },
        select: { refundState: true },
      });
      return outcomeForStoredState(current.refundState);
    }
    await tx.adminAuditLog.create({
      data: createAdminAuditCreateData({
        adminId: input.adminId,
        action: "order.refund.finalize_retry",
        targetType: "order",
        targetId: refund.order.id,
        summary: `Refund ${refund.id} requires local finalization retry.`,
        metadata: {
          refundId: refund.id,
          paymentTransactionId: payment.id,
          refundState: "finalize_retry",
        },
      }),
    });
    return { outcome: "finalize_retry" } as const;
  });
}

async function finalizeRefund(
  input: RefundExecutionInput,
  db: RefundDatabase,
  now: Date,
): Promise<RefundTerminalTransitionResult> {
  try {
    return await db.$transaction(async (tx) => {
      const refundReference = await tx.orderRefundRecord.findUnique({
        where: { id: input.refundId },
        select: {
          orderId: true,
          order: { select: { orderType: true, userId: true } },
        },
      });
      if (!refundReference) throw new Error("REFUND_NOT_FOUND");
      if (refundReference.order.orderType === "vip") {
        await lockVipEntitlementUser(tx, refundReference.order.userId);
      }

      const orderRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id
        FROM orders
        WHERE id = ${refundReference.orderId}
        FOR UPDATE
      `);
      if (orderRows.length !== 1) throw new Error("REFUND_ORDER_NOT_FOUND");

      const paymentRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id
        FROM payment_transactions
        WHERE order_id = ${refundReference.orderId}
        FOR UPDATE
      `);
      if (paymentRows.length !== 1) throw new Error("REFUND_PAYMENT_NOT_FOUND");

      const refundRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id
        FROM order_refund_records
        WHERE id = ${input.refundId}
        FOR UPDATE
      `);
      if (refundRows.length !== 1) throw new Error("REFUND_NOT_FOUND");

      const refund = await getRefundForExecution(tx, input.refundId);
      const payment = refund.order.paymentTransaction;
      if (!payment) throw new Error("REFUND_PAYMENT_NOT_FOUND");
      if (payment.provider !== "zpay") throw new Error("REFUND_STATE_MISMATCH");
      if (payment.refundRecordId !== refund.id) throw new Error("REFUND_STATE_MISMATCH");
      if (payment.refundState === "finalized") {
        return { outcome: "finalized", changed: false };
      }
      if (payment.refundState !== "provider_succeeded" && payment.refundState !== "finalize_retry") {
        return { ...outcomeForStoredState(payment.refundState), changed: false };
      }
      if (refund.status !== "pending") throw new Error("REFUND_STATE_MISMATCH");

      await revokeEntitlementsForRefundedOrder(
        tx,
        {
          id: refund.order.id,
          userId: refund.order.userId,
          orderType: refund.order.orderType,
          toolId: refund.order.toolId,
          activatedAt: refund.order.activatedAt,
          paidAt: refund.order.paidAt,
          createdAt: refund.order.createdAt,
        },
        now,
      );

      await tx.order.update({
        where: { id: refund.order.id },
        data: { orderStatus: "refunded" },
      });
      await tx.orderRefundRecord.update({
        where: { id: refund.id },
        data: {
          adminId: input.adminId,
          status: "completed",
          completedAt: refund.completedAt ?? now,
        },
      });
      await tx.paymentTransaction.update({
        where: { id: payment.id },
        data: {
          status: "refunded",
          refundState: "finalized",
          refundedAt: payment.refundedAt ?? now,
          refundLastErrorCode: null,
          refundLastErrorDetail: null,
        },
      });
      await tx.adminAuditLog.create({
        data: createAdminAuditCreateData({
          adminId: input.adminId,
          action: "order.refund.finalized",
          targetType: "order",
          targetId: refund.order.id,
          summary: `Refund ${refund.id} finalized and entitlements revoked.`,
          metadata: {
            refundId: refund.id,
            paymentTransactionId: payment.id,
            refundState: "finalized",
          },
        }),
      });
      return { outcome: "finalized", changed: true };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : null;
    if (
      errorMessage === VIP_REFUND_RECONCILIATION_REQUIRED ||
      errorMessage === "REFUND_STATE_MISMATCH" ||
      errorMessage === "REFUND_NOT_FOUND" ||
      errorMessage === "REFUND_ORDER_NOT_FOUND" ||
      errorMessage === "REFUND_PAYMENT_NOT_FOUND"
    ) {
      throw error;
    }
    const retryResult = await recordFinalizeRetry(input, db, now);
    return { ...retryResult, changed: false };
  }
}

export async function executeZpayRefund(
  input: RefundExecutionInput,
  dependencies: RefundExecutionDependencies = {},
): Promise<RefundTerminalTransitionResult> {
  const db = dependencies.db ?? prisma;
  const now = dependencies.now?.() ?? new Date();
  const claim = await claimRefundDispatch(input, db, now);
  if ("outcome" in claim) {
    if (claim.outcome === "finalize_retry") {
      return finalizeRefund(input, db, now);
    }
    return { ...claim, changed: false };
  }

  const consumeConfirmation =
    dependencies.consumeConfirmation ?? consumeZpayRefundConfirmation;
  consumeConfirmation({
    refundId: input.refundId,
    confirmationValue: input.refundConfirmation,
  });
  const providerRefund = dependencies.providerRefund ?? requestZpayRefund;
  const providerResult = await providerRefund({
    orderNo: claim.orderNo,
    amount: claim.amount,
  });
  const persisted = await persistProviderResult(
    claim,
    input.adminId,
    providerResult,
    db,
    dependencies.now?.() ?? new Date(),
  );
  if (providerResult.kind !== "succeeded") return persisted;
  const finalized = await finalizeRefund(input, db, dependencies.now?.() ?? new Date());
  return finalized;
}

export async function resolveAmbiguousZpayRefund(
  input: RefundExecutionInput & {
    resolution: "provider_succeeded" | "provider_rejected";
  },
  dependencies: RefundExecutionDependencies = {},
): Promise<RefundTerminalTransitionResult> {
  const db = dependencies.db ?? prisma;
  const now = dependencies.now?.() ?? new Date();
  let transitioned: RefundTerminalTransitionResult;
  try {
    transitioned = await db.$transaction(async (tx) => {
      const refundReference = await tx.orderRefundRecord.findUnique({
        where: { id: input.refundId },
        select: {
          orderId: true,
          order: { select: { orderType: true, userId: true } },
        },
      });
      if (!refundReference) throw new Error("REFUND_NOT_FOUND");
      if (refundReference.order.orderType === "vip") {
        await lockVipEntitlementUser(tx, refundReference.order.userId);
      }

      const orderRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM orders WHERE id = ${refundReference.orderId} FOR UPDATE
      `);
      if (orderRows.length !== 1) throw new Error("REFUND_ORDER_NOT_FOUND");
      const paymentRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM payment_transactions WHERE order_id = ${refundReference.orderId} FOR UPDATE
      `);
      if (paymentRows.length !== 1) throw new Error("REFUND_PAYMENT_NOT_FOUND");
      const refundRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM order_refund_records WHERE id = ${input.refundId} FOR UPDATE
      `);
      if (refundRows.length !== 1) throw new Error("REFUND_NOT_FOUND");

      const refund = await getRefundForExecution(tx, input.refundId);
      const payment = refund.order.paymentTransaction;
      if (!payment) throw new Error("REFUND_PAYMENT_NOT_FOUND");
      if (payment.provider !== "zpay") throw new Error("REFUND_STATE_MISMATCH");
      if (payment.refundRecordId !== refund.id) throw new Error("REFUND_STATE_MISMATCH");
      if (payment.refundState !== "ambiguous") {
        return { ...outcomeForStoredState(payment.refundState), changed: false };
      }
      if (refund.status !== "pending") throw new Error("REFUND_STATE_MISMATCH");
      if (
        input.resolution === "provider_rejected" &&
        isLatePaymentAfterLocalRefund(payment.refundLastErrorCode)
      ) {
        throw new Error("LATE_PAYMENT_REFUND_MUST_BE_CONFIRMED");
      }
      const manualEvidence = input.resolution === "provider_succeeded"
        ? getManualProviderRefundEvidence(input, refund, now)
        : null;

      await tx.paymentTransaction.update({
      where: { id: payment.id },
      data: {
        refundState: input.resolution,
        refundProviderRespondedAt: now,
        ...(manualEvidence
          ? {
              refundPayload: manualEvidence.payload,
              refundProviderReference: manualEvidence.providerRefundReference,
            }
          : {}),
        refundLastErrorCode: `manual-${input.resolution}`,
        refundLastErrorDetail: sanitizeRefundErrorDetail(input.note),
      },
      });
      await tx.orderRefundRecord.update({
      where: { id: refund.id },
      data: {
        adminId: input.adminId,
        status: getRefundReviewStatusForPaymentState(input.resolution),
        completedAt: null,
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...((manualEvidence?.refundProofImage ?? input.refundProofImage) !== undefined
          ? { refundProofImage: manualEvidence?.refundProofImage ?? input.refundProofImage }
          : {}),
      },
      });
      await tx.adminAuditLog.create({
      data: createAdminAuditCreateData({
        adminId: input.adminId,
        action: `order.refund.${input.resolution}.manual_reconciliation`,
        targetType: "order",
        targetId: refund.order.id,
        summary: `Ambiguous refund ${refund.id} manually resolved as ${input.resolution}.`,
        metadata: {
          refundId: refund.id,
          paymentTransactionId: payment.id,
          refundState: input.resolution,
          ...(manualEvidence
            ? { providerRefundReference: manualEvidence.providerRefundReference }
            : {}),
        },
      }),
      });
      return {
        ...outcomeForStoredState(input.resolution),
        changed: input.resolution === "provider_rejected",
      };
    });
  } catch (error) {
    if (isRefundProviderReferenceUniqueConflict(error)) {
      throw new Error("REFUND_PROVIDER_REFERENCE_REUSED");
    }
    throw error;
  }

  if (input.resolution === "provider_succeeded" && transitioned.outcome === "finalize_retry") {
    return finalizeRefund(input, db, now);
  }
  return transitioned;
}

export async function retryZpayRefundFinalization(
  input: RefundExecutionInput,
  dependencies: RefundExecutionDependencies = {},
) {
  return finalizeRefund(
    input,
    dependencies.db ?? prisma,
    dependencies.now?.() ?? new Date(),
  );
}

export async function markStaleZpayRefundDispatchesAmbiguous(
  input: { startedBefore: Date; refundId?: string; adminId?: string },
  dependencies: Pick<RefundExecutionDependencies, "db" | "now"> = {},
) {
  const db = dependencies.db ?? prisma;
  const now = dependencies.now?.() ?? new Date();
  return db.$transaction(async (tx) => {
    const stale = await tx.paymentTransaction.findMany({
      where: {
        refundState: "dispatching",
        refundDispatchStartedAt: { lt: input.startedBefore },
        ...(input.refundId ? { refundRecordId: input.refundId } : {}),
      },
      select: { id: true, orderId: true, refundRecordId: true },
    });
    let markedAmbiguous = 0;

    for (const payment of stale) {
      const updated = await tx.paymentTransaction.updateMany({
        where: {
          id: payment.id,
          refundState: "dispatching",
          refundDispatchStartedAt: { lt: input.startedBefore },
          ...(input.refundId ? { refundRecordId: input.refundId } : {}),
        },
        data: {
          refundState: "ambiguous",
          refundLastErrorCode: "dispatch-timeout",
          refundLastErrorDetail: null,
        },
      });
      if (updated.count !== 1) continue;

      markedAmbiguous += 1;
      await tx.adminAuditLog.create({
        data: createAdminAuditCreateData({
          adminId: input.adminId,
          action: "order.refund.ambiguous",
          targetType: "order",
          targetId: payment.orderId,
          summary: `Stale refund dispatch moved to ambiguous at ${now.toISOString()}.`,
          metadata: {
            refundId: payment.refundRecordId,
            paymentTransactionId: payment.id,
            refundState: "ambiguous",
            errorCode: "dispatch-timeout",
          },
        }),
      });
    }

    return { markedAmbiguous };
  });
}
