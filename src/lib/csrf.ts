import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getAuthSecret } from "@/lib/auth-security";

const separator = ".";

function signNonce(nonce: string, secret: string) {
  return createHmac("sha256", secret).update(nonce).digest("base64url");
}

function timingSafeStringEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createCsrfToken(secret: string, nonce = randomBytes(24).toString("base64url")) {
  return `${nonce}${separator}${signNonce(nonce, secret)}`;
}

export function verifyCsrfToken(cookieToken: string | undefined | null, formToken: string | undefined | null, secret: string) {
  if (!cookieToken || !formToken || cookieToken !== formToken) return false;
  const [nonce, signature] = cookieToken.split(separator);
  if (!nonce || !signature) return false;
  return timingSafeStringEqual(signature, signNonce(nonce, secret));
}

export async function getOrCreateCsrfToken() {
  return createCsrfToken(getAuthSecret());
}

export async function assertValidCsrfToken(formToken: FormDataEntryValue | null) {
  const token = String(formToken ?? "");
  if (!verifyCsrfToken(token, token, getAuthSecret())) {
    throw new Error("页面安全令牌已失效，请刷新后重试。");
  }
}
