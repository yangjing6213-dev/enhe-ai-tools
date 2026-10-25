"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { allowRecoveryRequest, completePasswordReset, completeRecoveryEmailVerification, createAccountRecoveryToken, getRecoveryTokenExpiry, hashAccountRecoveryToken, isValidRecoveryEmail, normalizeRecoveryEmail } from "@/lib/account-recovery";
import { requireUser, verifyPassword } from "@/lib/auth";
import { assertValidCsrfToken } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { buildLocalePath } from "@/lib/seo";
import { sendAccountRecoveryEmail } from "@/lib/account-recovery-email";

const genericRequestStatus = "sent";

export async function requestPasswordResetAction(formData: FormData) {
  const locale = await getCurrentLocale();
  await assertValidCsrfToken(formData.get("csrfToken"));
  const email = normalizeRecoveryEmail(String(formData.get("email") ?? ""));
  const ip = await getRequestIp();
  const isAllowed = isValidRecoveryEmail(email) && await allowRecoveryRequest(email, ip);

  if (isAllowed) {
    const user = await prisma.user.findUnique({
      where: { recoveryEmail: email },
      select: { id: true, status: true, recoveryEmail: true, recoveryVerifiedAt: true }
    });
    if (user?.status === "active" && user.recoveryEmail && user.recoveryVerifiedAt) {
      const token = createAccountRecoveryToken();
      const now = new Date();
      await createToken(user.id, user.recoveryEmail, token, "reset_password", now);
      try {
        await sendAccountRecoveryEmail({
          recipient: user.recoveryEmail,
          link: buildAbsoluteRecoveryLink("/reset-password", locale, token),
          purpose: "reset_password",
          locale
        });
      } catch {
        console.error("[account-recovery] email delivery failed");
      }
    }
  }

  redirect(withStatus("/forgot-password", locale, genericRequestStatus));
}

export async function bindRecoveryEmailAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const user = await requireUser(locale);
  await assertValidCsrfToken(formData.get("csrfToken"));
  const email = normalizeRecoveryEmail(String(formData.get("email") ?? ""));
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const ip = await getRequestIp();

  if (!isValidRecoveryEmail(email)) redirect(withStatus("/user/recovery-email", locale, "invalid"));
  if (!(await allowRecoveryRequest(email, ip))) {
    redirect(withStatus("/user/recovery-email", locale, "rate-limited"));
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, passwordHash: true, recoveryEmail: true, recoveryVerifiedAt: true }
  });
  if (!dbUser || !(await verifyPassword(currentPassword, dbUser.passwordHash))) {
    redirect(withStatus("/user/recovery-email", locale, "password"));
  }

  if (dbUser.recoveryEmail === email && dbUser.recoveryVerifiedAt) {
    redirect(withStatus("/user/recovery-email", locale, "already-verified"));
  }

  const [recoveryEmailOwner, loginEmailOwner] = await Promise.all([
    prisma.user.findUnique({ where: { recoveryEmail: email }, select: { id: true } }),
    prisma.user.findUnique({ where: { email }, select: { id: true } })
  ]);
  if (
    (recoveryEmailOwner && recoveryEmailOwner.id !== user.id) ||
    (loginEmailOwner && loginEmailOwner.id !== user.id)
  ) {
    redirect(withStatus("/user/recovery-email", locale, "conflict"));
  }

  const token = createAccountRecoveryToken();
  const now = new Date();
  await createToken(user.id, email, token, "verify_recovery_email", now);
  try {
    await sendAccountRecoveryEmail({
      recipient: email,
      link: buildAbsoluteRecoveryLink("/verify-recovery-email", locale, token),
      purpose: "verify_recovery_email",
      locale
    });
  } catch {
    console.error("[account-recovery] email delivery failed");
    redirect(withStatus("/user/recovery-email", locale, "mail-error"));
  }

  redirect(withStatus("/user/recovery-email", locale, "sent"));
}

export async function verifyRecoveryEmailAction(formData: FormData) {
  const locale = await getCurrentLocale();
  await assertValidCsrfToken(formData.get("csrfToken"));
  const token = String(formData.get("token") ?? "");
  const verified = await completeRecoveryEmailVerification(token);
  redirect(withStatus("/verify-recovery-email", locale, verified ? "verified" : "invalid"));
}

export async function resetPasswordAction(formData: FormData) {
  const locale = await getCurrentLocale();
  await assertValidCsrfToken(formData.get("csrfToken"));
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");
  if (password.length < 8 || password.length > 128 || password !== confirmation) {
    redirect(`${buildLocalePath("/reset-password", locale)}?${new URLSearchParams({ token, status: "invalid-password" })}`);
  }

  const completed = await completePasswordReset({ token, newPassword: password });
  redirect(withStatus("/reset-password", locale, completed ? "updated" : "invalid"));
}

async function createToken(
  userId: string,
  email: string,
  token: string,
  purpose: "verify_recovery_email" | "reset_password",
  now: Date
) {
  await prisma.$transaction(async (tx) => {
    await tx.accountRecoveryToken.deleteMany({ where: { userId, expiresAt: { lt: now } } });
    await tx.accountRecoveryToken.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: now }
    });
    await tx.accountRecoveryToken.create({
      data: {
        userId,
        email,
        tokenHash: hashAccountRecoveryToken(token),
        purpose,
        expiresAt: getRecoveryTokenExpiry(now)
      }
    });
  });
}

async function getRequestIp() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || null;
}

function buildAbsoluteRecoveryLink(path: string, locale: Locale, token: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://www.enhe-tech.com.cn";
  let origin = "https://www.enhe-tech.com.cn";
  try {
    const parsed = new URL(configuredUrl);
    if (parsed.protocol === "https:" || (process.env.NODE_ENV !== "production" && parsed.protocol === "http:")) {
      origin = parsed.origin;
    }
  } catch {
    // Keep the trusted production origin if an invalid URL is configured.
  }
  const link = new URL(buildLocalePath(path, locale), origin);
  link.searchParams.set("token", token);
  return link.toString();
}

function withStatus(path: string, locale: Locale, status: string) {
  const query = new URLSearchParams({ status });
  return `${buildLocalePath(path, locale)}?${query.toString()}`;
}
