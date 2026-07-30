export const LATE_PAYMENT_AFTER_LOCAL_REFUND_ERROR_CODE =
  "late-payment-after-local-refund";

export function isLatePaymentAfterLocalRefund(errorCode: string | null | undefined) {
  return errorCode === LATE_PAYMENT_AFTER_LOCAL_REFUND_ERROR_CODE;
}
