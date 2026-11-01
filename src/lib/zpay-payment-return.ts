import { randomUUID } from "node:crypto";
import { createSessionToken, hashSessionToken } from "@/lib/auth-security";

export const zpayReturnSessionIdPrefix = "zpay_return:";

export function getZpayPaymentReturnSessionIdPrefix(orderId: string) {
  const encodedOrderId = Buffer.from(orderId, "utf8").toString("base64url");
  return `${zpayReturnSessionIdPrefix}${encodedOrderId}:`;
}

export function createZpayPaymentReturnTicket(orderId: string) {
  const token = createSessionToken();
  return {
    id: `${getZpayPaymentReturnSessionIdPrefix(orderId)}${randomUUID()}`,
    token,
    tokenHash: hashSessionToken(token),
  };
}

export function getZpayPaymentReturnOrderId(sessionId: string) {
  if (!sessionId.startsWith(zpayReturnSessionIdPrefix)) return null;
  const encodedOrderId = sessionId.slice(zpayReturnSessionIdPrefix.length).split(":", 1)[0];
  if (!encodedOrderId) return null;
  try {
    const orderId = Buffer.from(encodedOrderId, "base64url").toString("utf8");
    return orderId && Buffer.from(orderId, "utf8").toString("base64url") === encodedOrderId
      ? orderId
      : null;
  } catch {
    return null;
  }
}

export function isZpayPaymentReturnToken(value: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}
