import type { PaymentRefundState, RefundStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  canResolveAmbiguousRefundAsProviderRejected,
  getRefundAdminReviewMode,
} from "@/lib/admin-refund-state";

function mode(input: {
  status?: RefundStatus;
  provider?: string | null;
  refundState?: PaymentRefundState | null;
}) {
  return getRefundAdminReviewMode({
    status: input.status ?? "pending",
    provider: input.provider ?? "zpay",
    refundState: input.refundState ?? null,
  });
}

describe("admin refund review mode", () => {
  it("keeps unclaimed and requested ZPAY refunds in standard review", () => {
    expect(mode({ refundState: null })).toBe("standard");
    expect(mode({ refundState: "requested" })).toBe("standard");
  });

  it("blocks provider retry while a refund dispatch is in flight", () => {
    expect(mode({ refundState: "dispatching" })).toBe("dispatching");
  });

  it("requires manual reconciliation for an ambiguous provider result", () => {
    expect(mode({ refundState: "ambiguous" })).toBe("resolve_ambiguous");
  });

  it("does not allow a late captured payment to be closed as provider rejected", () => {
    expect(
      canResolveAmbiguousRefundAsProviderRejected("late-payment-after-local-refund"),
    ).toBe(false);
    expect(canResolveAmbiguousRefundAsProviderRejected("dispatch-timeout")).toBe(true);
    expect(canResolveAmbiguousRefundAsProviderRejected(null)).toBe(true);
  });

  it("only retries local finalization after provider success", () => {
    expect(mode({ refundState: "provider_succeeded" })).toBe("retry_finalization");
    expect(mode({ refundState: "finalize_retry" })).toBe("retry_finalization");
  });

  it("keeps terminal and already reviewed refunds read-only", () => {
    expect(mode({ refundState: "provider_rejected" })).toBe("readonly");
    expect(mode({ refundState: "finalized" })).toBe("readonly");
    expect(mode({ status: "completed", refundState: "finalize_retry" })).toBe("readonly");
    expect(mode({ status: "rejected", refundState: "ambiguous" })).toBe("readonly");
  });

  it("uses the existing manual review for non-ZPAY refunds", () => {
    expect(mode({ provider: "manual", refundState: null })).toBe("standard");
  });
});
