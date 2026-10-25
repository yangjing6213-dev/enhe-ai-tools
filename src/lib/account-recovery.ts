import { createHash, createHmac, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAuthSecret } from "@/lib/auth-security";

const recoveryTokenLifetimeMs = 30 * 60 * 1000;
const recoveryAttemptWindowMs = 60 * 60 * 1000;
const maxAttemptsPerEmail = 3;
const maxAttemptsPerIp = 10;
const recoveryEmailSchema = z.string().max(254).email();

export function createAccountRecoveryToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAccountRecoveryToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeRecoveryEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidRecoveryEmail(value: string) {
  return recoveryEmailSchema.safeParse(normalizeRecoveryEmail(value)).success;
}

export function getRecoveryTokenExpiry(now = new Date()) {
  return new Date(now.getTime() + recoveryTokenLifetimeMs);
}

export async function allowRecoveryRequest(email: string, ip: string | null, now = new Date()) {
  const normalizedEmail = normalizeRecoveryEmail(email);
  const secret = getAuthSecret();
  const emailHash = createHmac("sha256", secret).update(`email:${normalizedEmail}`).digest("hex");
  const normalizedIp = ip?.trim() ?? "";
  const ipHash = normalizedIp
    ? createHmac("sha256", secret).update(`ip:${normalizedIp}`).digest("hex")
    : null;
  const since = new Date(now.getTime() - recoveryAttemptWindowMs);

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.accountRecoveryAttempt.deleteMany({ where: { createdAt: { lt: since } } });
      const emailAttempts = await tx.accountRecoveryAttempt.count({
        where: { emailHash, createdAt: { gte: since } }
      });
      const ipAttempts = ipHash
        ? await tx.accountRecoveryAttempt.count({ where: { ipHash, createdAt: { gte: since } } })
        : 0;

      const allowed = emailAttempts < maxAttemptsPerEmail && ipAttempts < maxAttemptsPerIp;
      if (allowed) await tx.accountRecoveryAttempt.create({ data: { emailHash, ipHash, createdAt: now } });
      return allowed;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return false;
    throw error;
  }
}

export async function completePasswordReset({
  token,
  newPassword,
  now = new Date()
}: {
  token: string;
  newPassword: string;
  now?: Date;
}) {
  if (!isTokenShapeValid(token) || newPassword.length < 8 || newPassword.length > 128) return false;

  const tokenRecord = await prisma.accountRecoveryToken.findUnique({
    where: { tokenHash: hashAccountRecoveryToken(token) },
    include: { user: { select: { status: true } } }
  });
  if (
    !tokenRecord ||
    tokenRecord.purpose !== "reset_password" ||
    tokenRecord.consumedAt ||
    tokenRecord.expiresAt <= now ||
    tokenRecord.user.status !== "active"
  ) return false;

  return prisma.$transaction(async (tx) => {
    const claim = await tx.accountRecoveryToken.updateMany({
      where: {
        id: tokenRecord.id,
        tokenHash: hashAccountRecoveryToken(token),
        purpose: "reset_password",
        consumedAt: null,
        expiresAt: { gt: now }
      },
      data: { consumedAt: now }
    });
    if (claim.count !== 1) return false;

    await tx.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash: await hashPassword(newPassword) }
    });
    await tx.session.updateMany({
      where: { userId: tokenRecord.userId, revokedAt: null },
      data: { revokedAt: now }
    });
    await tx.accountRecoveryToken.updateMany({
      where: { userId: tokenRecord.userId, consumedAt: null },
      data: { consumedAt: now }
    });
    return true;
  });
}

export async function completeRecoveryEmailVerification(token: string, now = new Date()) {
  if (!isTokenShapeValid(token)) return false;

  const tokenRecord = await prisma.accountRecoveryToken.findUnique({
    where: { tokenHash: hashAccountRecoveryToken(token) },
    include: { user: { select: { status: true } } }
  });
  if (
    !tokenRecord ||
    tokenRecord.purpose !== "verify_recovery_email" ||
    tokenRecord.consumedAt ||
    tokenRecord.expiresAt <= now ||
    tokenRecord.user.status !== "active"
  ) return false;

  try {
    return await prisma.$transaction(async (tx) => {
      const claim = await tx.accountRecoveryToken.updateMany({
        where: {
          id: tokenRecord.id,
          tokenHash: hashAccountRecoveryToken(token),
          purpose: "verify_recovery_email",
          consumedAt: null,
          expiresAt: { gt: now }
        },
        data: { consumedAt: now }
      });
      if (claim.count !== 1) return false;

      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { recoveryEmail: tokenRecord.email, recoveryVerifiedAt: now }
      });
      await tx.accountRecoveryToken.updateMany({
        where: { userId: tokenRecord.userId, consumedAt: null },
        data: { consumedAt: now }
      });
      return true;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  }
}

function isTokenShapeValid(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
