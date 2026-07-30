import type { PaymentRefundState, RefundStatus } from "@prisma/client";
import { isLatePaymentAfterLocalRefund } from "@/lib/refund-reconciliation";

export type RefundAdminReviewMode =
  | "standard"
  | "dispatching"
  | "resolve_ambiguous"
  | "retry_finalization"
  | "readonly";

export function getRefundAdminReviewMode(input: {
  status: RefundStatus;
  provider: string | null;
  refundState: PaymentRefundState | null;
}): RefundAdminReviewMode {
  if (input.status !== "pending") return "readonly";
  if (input.provider !== "zpay") return "standard";

  switch (input.refundState) {
    case null:
    case "requested":
      return "standard";
    case "dispatching":
      return "dispatching";
    case "ambiguous":
      return "resolve_ambiguous";
    case "provider_succeeded":
    case "finalize_retry":
      return "retry_finalization";
    case "provider_rejected":
    case "finalized":
      return "readonly";
  }
}

export function canResolveAmbiguousRefundAsProviderRejected(
  errorCode: string | null | undefined,
) {
  return !isLatePaymentAfterLocalRefund(errorCode);
}
