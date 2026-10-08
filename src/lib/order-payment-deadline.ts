export const unpaidOrderTimeoutMs = 10 * 60 * 1_000;

export function isOrderPaymentExpired(createdAt: Date, now = new Date()) {
  return now.getTime() >= createdAt.getTime() + unpaidOrderTimeoutMs;
}
