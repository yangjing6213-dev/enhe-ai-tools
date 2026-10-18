import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { isIP } from "node:net";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { headerUserCookieName } from "@/lib/header-user-cookie";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import {
  createSessionToken,
  getAuthSecret,
  hashSessionToken,
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

export async function updatePasswordAndRevokeSessions(userId: string, password: string) {
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { googleSubject: true } });
    if (!user) throw new Error("USER_NOT_FOUND");
    if (user.googleSubject) throw new Error("GOOGLE_MANAGED_PASSWORD");
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await tx.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  });
}

function trustedClientIp(headerStore: Headers) {
  // The edge proxy overwrites X-Real-IP; a forwarded-for prefix can be supplied by the client.
  const ip = headerStore.get("x-real-ip")?.trim();
  return ip && isIP(ip) ? ip : "unknown";
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
      ip: trustedClientIp(headerStore),
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
    acceptEmailUpdates: session.user.acceptEmailUpdates,
    googleSubject: session.user.googleSubject
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
  return reserveAuthAttempt(identifier, "login");
}

export async function assertRegistrationNotLimited(identifier: string) {
  await reserveAuthAttempt(identifier, "register");
}

async function reserveAuthAttempt(identifier: string, purpose: "login" | "register") {
  const ip = trustedClientIp(await headers());
  const registration = purpose === "register";
  const storedIdentifier = registration ? `register:${identifier}` : identifier;
  const windowMs = registration ? 60 * 60 * 1000 : 15 * 60 * 1000;
  const createdAt = { gte: new Date(Date.now() - windowMs) };

  return prisma.$transaction(async (tx) => {
    // Reserve before password hashing/account creation, serializing both scopes across app instances.
    const lockKeys = [`${purpose}:account:${identifier}`, `${purpose}:ip:${ip}`].sort();
    for (const key of lockKeys) {
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${key}))::text`);
    }
    const accountCount = await tx.loginAttempt.count({
      where: { identifier: storedIdentifier, createdAt, ...(registration ? {} : { success: false }) }
    });
    const ipCount = await tx.loginAttempt.count({
      where: { ip, createdAt, ...(registration ? { identifier: { startsWith: "register:" } } : { success: false }) }
    });
    if (accountCount >= (registration ? 3 : 5) || ipCount >= (registration ? 10 : 30)) {
      throw new Error(registration ? "REGISTER_LIMITED" : "LOGIN_LIMITED");
    }
    const attempt = await tx.loginAttempt.create({ data: { identifier: storedIdentifier, ip, success: registration } });
    return attempt.id;
  });
}

export async function recordLoginAttempt(identifier: string, success: boolean, attemptId: string) {
  await prisma.loginAttempt.update({ where: { id: attemptId, identifier }, data: { success } });
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

export async function refreshHeaderUserCookieSnapshot(user: HeaderUserSnapshot) {
  const cookieStore = await cookies();
  setHeaderUserCookie(cookieStore, user);
}
