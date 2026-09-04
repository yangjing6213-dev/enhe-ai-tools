import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const sessionCookieSeparator = ".";
const headerUserCookieSeparator = ".";
const loginLimitWindowMs = 15 * 60 * 1000;
const loginLimitMaxFailures = 5;

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function timingSafeStringEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function signSessionCookieValue(sessionId: string, token: string, secret: string) {
  const payload = `${sessionId}${sessionCookieSeparator}${token}`;
  return `${payload}${sessionCookieSeparator}${signPayload(payload, secret)}`;
}

export function signHeaderUserCookieValue(payload: string, secret: string) {
  return `${payload}${headerUserCookieSeparator}${signPayload(payload, secret)}`;
}

export function verifySessionCookieValue(value: string | undefined | null, secret: string) {
  if (!value) return null;
  const parts = value.split(sessionCookieSeparator);
  if (parts.length !== 3) return null;

  const [sessionId, token, signature] = parts;
  if (!sessionId || !token || !signature) return null;

  const payload = `${sessionId}${sessionCookieSeparator}${token}`;
  const expected = signPayload(payload, secret);
  if (!timingSafeStringEqual(signature, expected)) return null;
  return { sessionId, token };
}

export function verifyHeaderUserCookieValue(value: string | undefined | null, secret: string) {
  if (!value) return null;
  const lastSeparatorIndex = value.lastIndexOf(headerUserCookieSeparator);
  if (lastSeparatorIndex <= 0) return null;

  const payload = value.slice(0, lastSeparatorIndex);
  const signature = value.slice(lastSeparatorIndex + headerUserCookieSeparator.length);
  if (!payload || !signature) return null;

  const expected = signPayload(payload, secret);
  if (!timingSafeStringEqual(signature, expected)) return null;
  return payload;
}

export function isLoginLimited(failedAttemptDates: Date[], now = new Date()) {
  const cutoff = now.getTime() - loginLimitWindowMs;
  const recentFailures = failedAttemptDates.filter((date) => date.getTime() >= cutoff);
  return recentFailures.length >= loginLimitMaxFailures;
}

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be at least 16 characters in production.");
  }
  return "development-auth-secret";
}
