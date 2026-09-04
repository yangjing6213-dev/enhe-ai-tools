import { Prisma, type ApiCreditBalanceBucket, type ApiCreditTransaction, type ApiWallet } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getOrCreateApiDeveloperProfile } from "./developer-profile";

export type WalletTrendPoint = {
  day: string;
  chargedUsd: string;
  requestCount: number;
};

export type WalletSummary = {
  walletId: string;
  balances: {
    totalAvailableUsd: string;
    planBalanceUsd: string;
    rechargeBalanceUsd: string;
    referralBalanceUsd: string;
    lockedBalanceUsd: string;
  };
  windows: {
    fiveHourChargedUsd: string;
    fiveHourRequestCount: number;
    sevenDayChargedUsd: string;
    sevenDayRequestCount: number;
  };
  trend: WalletTrendPoint[];
};

export type CheckSufficientCreditInput = {
  userId: string;
  developerProfileId: string;
  estimatedCostUsd: DecimalInput;
};

export type CheckSufficientCreditResult =
  | { ok: true; totalAvailableUsd: string }
  | { ok: false; reason: "developer_not_active" | "wallet_not_found" | "insufficient_credit" | "invalid_amount"; totalAvailableUsd?: string };

export type ChargeUsageInput = {
  userId: string;
  developerProfileId: string;
  usageLogId?: string;
  requestId?: string;
  amountUsd: DecimalInput;
  reason?: string;
  idempotencyKey?: string;
};

export type ChargeUsageResult =
  | {
      ok: true;
      idempotent: boolean;
      transactionId: string;
      chargedUsd: string;
      wallet: WalletBalanceSnapshot;
    }
  | {
      ok: false;
      reason: "invalid_amount" | "missing_idempotency_key" | "usage_log_not_found" | "wallet_not_found" | "insufficient_credit" | "charge_failed";
      totalAvailableUsd?: string;
    };

type DecimalInput = string | number | Prisma.Decimal;

type WalletBalanceSnapshot = {
  planBalanceUsd: string;
  rechargeBalanceUsd: string;
  referralBalanceUsd: string;
  lockedBalanceUsd: string;
  totalAvailableUsd: string;
};

type DeductionPlan = {
  plan: Prisma.Decimal;
  recharge: Prisma.Decimal;
  referral: Prisma.Decimal;
  bucket: ApiCreditBalanceBucket;
  after: {
    planBalanceUsd: Prisma.Decimal;
    rechargeBalanceUsd: Prisma.Decimal;
    referralBalanceUsd: Prisma.Decimal;
    lockedBalanceUsd: Prisma.Decimal;
  };
};

const maxCreateAttempts = 5;
const maxChargeAttempts = 3;
const zero = new Prisma.Decimal(0);

export async function getOrCreateApiWallet(userId: string, developerProfileId: string): Promise<ApiWallet> {
  const existing = await prisma.apiWallet.findUnique({
    where: { userId }
  });
  if (existing) return existing;

  for (let attempt = 0; attempt < maxCreateAttempts; attempt += 1) {
    try {
      return await prisma.apiWallet.create({
        data: { userId, developerProfileId }
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      const wallet = await prisma.apiWallet.findUnique({
        where: { userId }
      });
      if (wallet) return wallet;
    }
  }

  const wallet = await prisma.apiWallet.findUnique({
    where: { userId }
  });
  if (wallet) return wallet;

  throw new Error("Unable to initialize ENHE API wallet.");
}

export async function getWalletSummaryForCurrentUser(): Promise<WalletSummary> {
  const user = await requireUser();
  const developerProfile = await getOrCreateApiDeveloperProfile(user);
  const wallet = await getOrCreateApiWallet(user.id, developerProfile.id);
  const now = new Date();
  const [fiveHourUsage, sevenDayUsage, trend] = await Promise.all([
    aggregateBilledUsage(user.id, new Date(now.getTime() - 5 * 60 * 60 * 1000)),
    aggregateBilledUsage(user.id, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
    getSevenDayUsageTrend(user.id, now)
  ]);

  return {
    walletId: wallet.id,
    balances: toWalletBalanceSnapshot(wallet),
    windows: {
      fiveHourChargedUsd: decimalToString(fiveHourUsage.chargedUsd),
      fiveHourRequestCount: fiveHourUsage.requestCount,
      sevenDayChargedUsd: decimalToString(sevenDayUsage.chargedUsd),
      sevenDayRequestCount: sevenDayUsage.requestCount
    },
    trend
  };
}

export async function checkSufficientCredit(input: CheckSufficientCreditInput): Promise<CheckSufficientCreditResult> {
  const estimatedCost = parsePositiveDecimal(input.estimatedCostUsd);
  if (!estimatedCost) return { ok: false, reason: "invalid_amount" };

  const profile = await prisma.apiDeveloperProfile.findFirst({
    where: { id: input.developerProfileId, userId: input.userId },
    select: { status: true }
  });
  if (!profile || profile.status !== "active") {
    return { ok: false, reason: "developer_not_active" };
  }

  const wallet = await prisma.apiWallet.findFirst({
    where: { userId: input.userId, developerProfileId: input.developerProfileId }
  });
  if (!wallet) return { ok: false, reason: "wallet_not_found" };

  const totalAvailable = getTotalAvailable(wallet);
  if (totalAvailable.lt(estimatedCost)) {
    return {
      ok: false,
      reason: "insufficient_credit",
      totalAvailableUsd: decimalToString(totalAvailable)
    };
  }

  return { ok: true, totalAvailableUsd: decimalToString(totalAvailable) };
}

export async function chargeUsage(input: ChargeUsageInput): Promise<ChargeUsageResult> {
  const amount = parsePositiveDecimal(input.amountUsd);
  if (!amount) return { ok: false, reason: "invalid_amount" };

  const idempotencyKey = getChargeIdempotencyKey(input);
  if (!idempotencyKey) return { ok: false, reason: "missing_idempotency_key" };

  for (let attempt = 0; attempt < maxChargeAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existingTransaction = await tx.apiCreditTransaction.findUnique({
            where: { idempotencyKey },
            include: { wallet: true }
          });
          if (existingTransaction) {
            return mapExistingChargeResult(existingTransaction);
          }

          const usageLog = await findChargeUsageLog(tx, input);
          if (!usageLog) return { ok: false, reason: "usage_log_not_found" as const };

          const wallet = await tx.apiWallet.findFirst({
            where: { userId: input.userId, developerProfileId: input.developerProfileId }
          });
          if (!wallet) return { ok: false, reason: "wallet_not_found" as const };

          const deduction = buildDeductionPlan(wallet, amount);
          if (!deduction) {
            return {
              ok: false,
              reason: "insufficient_credit" as const,
              totalAvailableUsd: decimalToString(getTotalAvailable(wallet))
            };
          }

          const updated = await tx.apiWallet.updateMany({
            where: { id: wallet.id, version: wallet.version },
            data: {
              planBalanceUsd: deduction.after.planBalanceUsd,
              rechargeBalanceUsd: deduction.after.rechargeBalanceUsd,
              referralBalanceUsd: deduction.after.referralBalanceUsd,
              version: { increment: 1 }
            }
          });

          if (updated.count !== 1) {
            throw new Prisma.PrismaClientKnownRequestError("Wallet version conflict.", {
              code: "P2034",
              clientVersion: Prisma.prismaVersion.client
            });
          }

          const transaction = await tx.apiCreditTransaction.create({
            data: {
              userId: input.userId,
              developerProfileId: input.developerProfileId,
              walletId: wallet.id,
              usageLogId: usageLog.id,
              idempotencyKey,
              transactionType: "api_charge",
              amountUsd: amount.negated(),
              balanceBucket: deduction.bucket,
              balanceAfter: createBalanceAfterSnapshot(deduction.after),
              reason: normalizeReason(input.reason)
            }
          });

          await tx.apiUsageLog.update({
            where: { id: usageLog.id },
            data: {
              billingStatus: "billed",
              chargedUsd: amount,
              walletTransactionId: transaction.id
            }
          });

          return {
            ok: true as const,
            idempotent: false,
            transactionId: transaction.id,
            chargedUsd: decimalToString(amount),
            wallet: toWalletBalanceSnapshot({
              ...wallet,
              planBalanceUsd: deduction.after.planBalanceUsd,
              rechargeBalanceUsd: deduction.after.rechargeBalanceUsd,
              referralBalanceUsd: deduction.after.referralBalanceUsd
            })
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (isRetryableTransactionError(error) && attempt < maxChargeAttempts - 1) continue;
      if (isUniqueConstraintError(error)) {
        const existing = await prisma.apiCreditTransaction.findUnique({
          where: { idempotencyKey },
          include: { wallet: true }
        });
        if (existing) return mapExistingChargeResult(existing);
      }
      return { ok: false, reason: "charge_failed" };
    }
  }

  return { ok: false, reason: "charge_failed" };
}

async function aggregateBilledUsage(userId: string, start: Date) {
  const aggregate = await prisma.apiUsageLog.aggregate({
    where: {
      userId,
      billingStatus: "billed",
      createdAt: { gte: start }
    },
    _count: { _all: true },
    _sum: { chargedUsd: true }
  });

  return {
    requestCount: aggregate._count._all,
    chargedUsd: aggregate._sum.chargedUsd ?? zero
  };
}

async function getSevenDayUsageTrend(userId: string, now: Date): Promise<WalletTrendPoint[]> {
  const buckets = getUtc8DayBuckets(now, 7);
  const rows = await Promise.all(
    buckets.map(async (bucket) => {
      const usage = await aggregateBilledUsageForRange(userId, bucket.start, bucket.end);
      return {
        day: bucket.label,
        chargedUsd: decimalToString(usage.chargedUsd),
        requestCount: usage.requestCount
      };
    })
  );
  return rows;
}

async function aggregateBilledUsageForRange(userId: string, start: Date, end: Date) {
  const aggregate = await prisma.apiUsageLog.aggregate({
    where: {
      userId,
      billingStatus: "billed",
      createdAt: { gte: start, lt: end }
    },
    _count: { _all: true },
    _sum: { chargedUsd: true }
  });

  return {
    requestCount: aggregate._count._all,
    chargedUsd: aggregate._sum.chargedUsd ?? zero
  };
}

function buildDeductionPlan(wallet: Pick<ApiWallet, "planBalanceUsd" | "rechargeBalanceUsd" | "referralBalanceUsd" | "lockedBalanceUsd">, amount: Prisma.Decimal): DeductionPlan | null {
  let remaining = amount;
  const plan = minDecimal(wallet.planBalanceUsd, remaining);
  remaining = remaining.minus(plan);
  const recharge = minDecimal(wallet.rechargeBalanceUsd, remaining);
  remaining = remaining.minus(recharge);
  const referral = minDecimal(wallet.referralBalanceUsd, remaining);
  remaining = remaining.minus(referral);

  if (remaining.gt(zero)) return null;

  const usedBuckets = [
    plan.gt(zero) ? "plan" : null,
    recharge.gt(zero) ? "recharge" : null,
    referral.gt(zero) ? "referral" : null
  ].filter(Boolean) as ApiCreditBalanceBucket[];

  return {
    plan,
    recharge,
    referral,
    bucket: usedBuckets.length === 1 ? usedBuckets[0] : "mixed",
    after: {
      planBalanceUsd: wallet.planBalanceUsd.minus(plan),
      rechargeBalanceUsd: wallet.rechargeBalanceUsd.minus(recharge),
      referralBalanceUsd: wallet.referralBalanceUsd.minus(referral),
      lockedBalanceUsd: wallet.lockedBalanceUsd
    }
  };
}

function getTotalAvailable(wallet: Pick<ApiWallet, "planBalanceUsd" | "rechargeBalanceUsd" | "referralBalanceUsd" | "lockedBalanceUsd">) {
  const total = wallet.planBalanceUsd.plus(wallet.rechargeBalanceUsd).plus(wallet.referralBalanceUsd).minus(wallet.lockedBalanceUsd);
  return total.gt(zero) ? total : zero;
}

function toWalletBalanceSnapshot(wallet: Pick<ApiWallet, "planBalanceUsd" | "rechargeBalanceUsd" | "referralBalanceUsd" | "lockedBalanceUsd">): WalletBalanceSnapshot {
  return {
    totalAvailableUsd: decimalToString(getTotalAvailable(wallet)),
    planBalanceUsd: decimalToString(wallet.planBalanceUsd),
    rechargeBalanceUsd: decimalToString(wallet.rechargeBalanceUsd),
    referralBalanceUsd: decimalToString(wallet.referralBalanceUsd),
    lockedBalanceUsd: decimalToString(wallet.lockedBalanceUsd)
  };
}

function createBalanceAfterSnapshot(balance: DeductionPlan["after"]) {
  return {
    plan_balance_usd: decimalToString(balance.planBalanceUsd),
    recharge_balance_usd: decimalToString(balance.rechargeBalanceUsd),
    referral_balance_usd: decimalToString(balance.referralBalanceUsd),
    locked_balance_usd: decimalToString(balance.lockedBalanceUsd)
  };
}

function getChargeIdempotencyKey(input: ChargeUsageInput) {
  if (input.idempotencyKey) return normalizeText(input.idempotencyKey, 160);
  if (input.usageLogId) return `api_charge:usage_log:${normalizeText(input.usageLogId, 128)}`;
  if (input.requestId) return `api_charge:request:${normalizeText(input.requestId, 128)}`;
  return "";
}

async function findChargeUsageLog(
  tx: Prisma.TransactionClient,
  input: ChargeUsageInput
) {
  if (input.usageLogId) {
    return tx.apiUsageLog.findFirst({
      where: {
        id: input.usageLogId,
        userId: input.userId,
        developerProfileId: input.developerProfileId
      },
      select: { id: true }
    });
  }

  if (input.requestId) {
    return tx.apiUsageLog.findFirst({
      where: {
        requestId: input.requestId,
        userId: input.userId,
        developerProfileId: input.developerProfileId
      },
      select: { id: true }
    });
  }

  return null;
}

function mapExistingChargeResult(transaction: ApiCreditTransaction & { wallet: ApiWallet }): ChargeUsageResult {
  return {
    ok: true,
    idempotent: true,
    transactionId: transaction.id,
    chargedUsd: decimalToString(transaction.amountUsd.abs()),
    wallet: toWalletBalanceSnapshot(transaction.wallet)
  };
}

function parsePositiveDecimal(value: DecimalInput) {
  try {
    const decimal = new Prisma.Decimal(value);
    if (!decimal.isFinite() || decimal.lte(zero)) return null;
    return decimal;
  } catch {
    return null;
  }
}

function minDecimal(left: Prisma.Decimal, right: Prisma.Decimal) {
  return left.lt(right) ? left : right;
}

function decimalToString(value: Prisma.Decimal) {
  return value.toFixed(8);
}

function normalizeReason(value: string | undefined) {
  const normalized = normalizeText(value, 300);
  return normalized || null;
}

function normalizeText(value: string | undefined, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function getUtc8DayBuckets(now: Date, days: number) {
  const offsetMs = 8 * 60 * 60 * 1000;
  const shifted = new Date(now.getTime() + offsetMs);
  const todayStartUtcMs = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - offsetMs;
  return Array.from({ length: days }, (_, index) => {
    const start = new Date(todayStartUtcMs - (days - 1 - index) * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return {
      start,
      end,
      label: new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" }).format(start)
    };
  });
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function isRetryableTransactionError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}
