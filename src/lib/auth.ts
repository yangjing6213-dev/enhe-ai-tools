import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { headerUserCookieName } from "@/lib/header-user-cookie";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import {
  createSessionToken,
  getAuthSecret,
  hashSessionToken,
  isLoginLimited,
  signHeaderUserCookieValue,
  signSessionCookieValue,
  verifyHeaderUserCookieValue,
  verifySessionCookieValue
} from "@/lib/auth-security";
import { buildLocalePath } from "@/lib/seo";

const cookieName = process.env.AUTH_COOKIE_NAME ?? "enhe_session";
const sessionDays = 30;

type HeaderUserSnapshot = {
  email: string | null;
  nickname: string | null;
  role: "admin" | "user";
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signInUser(userId: string) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * sessionDays);
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      userAgent: headerStore.get("user-agent"),
      ip: headerStore.get("x-forwarded-for")?.split(",")[0] ?? null,
      expiresAt
    }
  });
  cookieStore.set(cookieName, signSessionCookieValue(session.id, token, getAuthSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * sessionDays
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, nickname: true, role: true }
  });
  if (user) {
    setHeaderUserCookie(cookieStore, user);
  }
}

export async function signOutUser() {
  const cookieStore = await cookies();
  const parsed = verifySessionCookieValue(cookieStore.get(cookieName)?.value, getAuthSecret());
  if (parsed) {
    await prisma.session.updateMany({
      where: { id: parsed.sessionId, tokenHash: hashSessionToken(parsed.token), revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }
  cookieStore.delete(cookieName);
  cookieStore.delete(headerUserCookieName);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const parsed = verifySessionCookieValue(cookieStore.get(cookieName)?.value, getAuthSecret());
  if (!parsed) return null;
  const session = await prisma.session.findFirst({
    where: {
      id: parsed.sessionId,
      tokenHash: hashSessionToken(parsed.token),
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  });
  if (!session || session.user.status !== "active") return null;

  await prisma.session.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() }
  });

  return {
    id: session.user.id,
    email: session.user.email,
    phone: session.user.phone,
    nickname: session.user.nickname,
    avatar: session.user.avatar,
    role: session.user.role,
    status: session.user.status,
    createdAt: session.user.createdAt,
    newsletterEmail: session.user.newsletterEmail,
    acceptEmailUpdates: session.user.acceptEmailUpdates
  };
}

export async function getHeaderUserSnapshot(): Promise<HeaderUserSnapshot | null> {
  const cookieStore = await cookies();
  const payload = verifyHeaderUserCookieValue(cookieStore.get(headerUserCookieName)?.value, getAuthSecret());
  if (!payload) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as HeaderUserSnapshot;
    if (!parsed || (parsed.role !== "admin" && parsed.role !== "user")) return null;
    return {
      email: parsed.email ?? null,
      nickname: parsed.nickname ?? null,
      role: parsed.role
    };
  } catch {
    return null;
  }
}

export async function requireUser(localeOverride?: Locale) {
  const user = await getCurrentUser();
  if (!user) {
    const locale = localeOverride ?? (await getCurrentLocale());
    redirect(buildLocalePath("/login", locale));
  }
  return user;
}

export async function requireAdmin(localeOverride?: Locale) {
  const user = await requireUser(localeOverride);
  if (user.role !== "admin") {
    const locale = localeOverride ?? (await getCurrentLocale());
    redirect(buildLocalePath("/", locale));
  }
  return user;
}

export async function assertLoginNotLimited(identifier: string) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0] ?? null;
  const attempts = await prisma.loginAttempt.findMany({
    where: {
      identifier,
      success: false,
      createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      ...(ip ? { OR: [{ ip }, { identifier }] } : {})
    },
    select: { createdAt: true }
  });
  if (isLoginLimited(attempts.map((attempt) => attempt.createdAt))) {
    throw new Error("LOGIN_LIMITED");
  }
}

export async function recordLoginAttempt(identifier: string, success: boolean) {
  const headerStore = await headers();
  await prisma.loginAttempt.create({
    data: {
      identifier,
      success,
      ip: headerStore.get("x-forwarded-for")?.split(",")[0] ?? null
    }
  });
}

function setHeaderUserCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  user: { email: string | null; nickname: string | null; role: "admin" | "user" }
) {
  const payload = Buffer.from(
    JSON.stringify({
      email: user.email,
      nickname: user.nickname,
      role: user.role
    }),
    "utf8"
  ).toString("base64url");

  cookieStore.set(headerUserCookieName, signHeaderUserCookieValue(payload, getAuthSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * sessionDays
  });
}
