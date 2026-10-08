import type { PaymentMethod } from "@prisma/client";
import type { ZpayConfig } from "@/lib/zpay-config";
import { formatZpayAmount, mapPaymentMethodToZpayType } from "@/lib/zpay";

export type ZpayOrderQueryResult = { kind: "paid" | "unpaid" | "not_found" | "unknown" };

// This endpoint is read-only. Never log its URL: ZPAY requires the key in the query.
export async function queryZpayOrder(
  order: { orderNo: string; amount: { toString(): string }; paymentMethod: PaymentMethod | null; providerTradeNo?: string | null },
  config: ZpayConfig,
): Promise<ZpayOrderQueryResult> {
  if (config.mode !== "live" || !config.pid || !config.key) return { kind: "unknown" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const url = new URL("api.php", `${config.apiBase.replace(/\/+$/, "")}/`);
    if (url.protocol !== "https:" || url.username || url.password) return { kind: "unknown" };
    url.search = new URLSearchParams({ act: "order", pid: config.pid, key: config.key, out_trade_no: order.orderNo }).toString();
    const response = await fetch(url, { redirect: "error", cache: "no-store", signal: controller.signal });
    if (!response.ok || !response.body) return { kind: "unknown" };
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16 * 1024) {
        await reader.cancel();
        return { kind: "unknown" };
      }
      chunks.push(value);
    }
    const result: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!result || typeof result !== "object" || Array.isArray(result)) return { kind: "unknown" };
    const data = result as Record<string, unknown>;
    if (String(data.code) === "0" && data.msg === "订单编号不存在") return { kind: "not_found" };
    const expectedType = mapPaymentMethodToZpayType(order.paymentMethod, config.defaultType);
    const receivedType = data.type === "wxpay2" ? "wxpay" : data.type;
    const tradeNo = typeof data.trade_no === "string" ? data.trade_no.trim()
      : typeof data.trade_no === "number" && Number.isSafeInteger(data.trade_no) && data.trade_no > 0
        ? String(data.trade_no) : "";
    if (String(data.code) !== "1" || String(data.pid) !== config.pid ||
        data.out_trade_no !== order.orderNo || receivedType !== expectedType ||
        !tradeNo || tradeNo.length > 128 || (order.providerTradeNo && tradeNo !== order.providerTradeNo) ||
        !/^\d+(\.\d{1,2})?$/.test(String(data.money)) ||
        formatZpayAmount(String(data.money)) !== formatZpayAmount(order.amount.toString())) {
      return { kind: "unknown" };
    }
    if (String(data.status) === "1") return { kind: "paid" };
    if (String(data.status) === "0") return { kind: "unpaid" };
    return { kind: "unknown" };
  } catch {
    return { kind: "unknown" };
  } finally {
    clearTimeout(timeout);
  }
}
