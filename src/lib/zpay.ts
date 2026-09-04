import crypto from "node:crypto";
import type { PaymentMethod } from "@prisma/client";
import type { ZpayPaymentType } from "@/lib/zpay-config";

type ZpayParamValue = string | number | null | undefined;
const zpayItemNameMaxBytes = 96;

export type ZpayParams = Record<string, ZpayParamValue>;

export type ZpaySignedParams<T extends ZpayParams> = T & {
  sign: string;
  sign_type: "MD5";
};

export type ZpayNotifyVerificationResult =
  | { ok: true; reason: null }
  | { ok: false; reason: "missing-signature" | "invalid-signature" };

function isSignableValue(value: ZpayParamValue) {
  return value !== undefined && value !== null && String(value) !== "";
}

export function buildZpaySignSource(params: ZpayParams, merchantKey: string) {
  const query = Object.keys(params)
    .filter((key) => key !== "sign" && key !== "sign_type" && isSignableValue(params[key]))
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join("&");
  return `${query}${merchantKey}`;
}

export function createZpaySign(params: ZpayParams, merchantKey: string) {
  return crypto.createHash("md5").update(buildZpaySignSource(params, merchantKey), "utf8").digest("hex");
}

export function buildZpaySignedParams<T extends ZpayParams>(params: T, merchantKey: string): ZpaySignedParams<T> {
  const payload = { ...params, sign_type: "MD5" as const };
  return { ...payload, sign: createZpaySign(payload, merchantKey) };
}

export function verifyZpayNotifyPayload(params: ZpayParams, merchantKey: string): ZpayNotifyVerificationResult {
  const receivedSign = params.sign ? String(params.sign) : "";
  if (!receivedSign) return { ok: false, reason: "missing-signature" };
  const expectedSign = createZpaySign(params, merchantKey);
  return expectedSign.toLowerCase() === receivedSign.toLowerCase()
    ? { ok: true, reason: null }
    : { ok: false, reason: "invalid-signature" };
}

export function formatZpayAmount(value: string | number) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid payment amount.");
  }
  return amount.toFixed(2);
}

export function truncateUtf8(value: string, maxBytes: number) {
  let result = "";
  let bytes = 0;
  for (const char of value) {
    const charBytes = Buffer.byteLength(char, "utf8");
    if (bytes + charBytes > maxBytes) break;
    result += char;
    bytes += charBytes;
  }
  return result;
}

export function normalizeZpayItemName(value: string, fallback = "ENHE 付费下载") {
  const normalized = value.trim().replace(/\s+/g, " ");
  const name = normalized || fallback;
  return truncateUtf8(name, zpayItemNameMaxBytes) || fallback;
}

export function mapPaymentMethodToZpayType(method?: PaymentMethod | null, fallback: ZpayPaymentType = "alipay"): ZpayPaymentType {
  if (method === "wechat") return "wxpay";
  if (method === "alipay") return "alipay";
  return fallback;
}

export function mapZpayTypeToPaymentMethod(type?: string | null): PaymentMethod {
  return type === "wxpay" ? "wechat" : "alipay";
}
