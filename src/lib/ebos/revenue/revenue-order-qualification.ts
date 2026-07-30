import type { EbosRevenueOrderRecord } from "./revenue-evidence-types";

export function isCountableRevenueOrder(order: EbosRevenueOrderRecord) {
  return order.isTestData !== true
    && paymentSucceeded(order)
    && delivered(order)
    && !hasRefund(order);
}

export function isUndeliveredPaidRevenueOrder(order: EbosRevenueOrderRecord) {
  return order.isTestData !== true
    && paymentSucceeded(order)
    && !delivered(order)
    && !isCompletedRefund(order);
}

export function isCompletedRefund(order: EbosRevenueOrderRecord) {
  return order.hasCompletedRefund === true
    || order.status === "refunded"
    || (order.refundedAmount ?? 0) > 0;
}

function paymentSucceeded(order: EbosRevenueOrderRecord) {
  return order.paymentSucceeded ?? (order.status === "paid" || order.status === "activated");
}

function delivered(order: EbosRevenueOrderRecord) {
  return order.delivered ?? order.status === "activated";
}

function hasRefund(order: EbosRevenueOrderRecord) {
  return order.hasPendingRefund === true || isCompletedRefund(order);
}
