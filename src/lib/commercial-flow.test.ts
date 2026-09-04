import { describe, expect, it } from "vitest";
import { canDownloadPaidTool } from "@/lib/access-rules";
import { canUserCancelOrder } from "@/lib/order-rules";

describe("critical commercial flow rules", () => {
  it("keeps order cancellation limited to non-final states", () => {
    expect(canUserCancelOrder("pending_payment")).toBe(true);
    expect(canUserCancelOrder("pending_review")).toBe(true);
    expect(canUserCancelOrder("rejected")).toBe(true);
    expect(canUserCancelOrder("paid")).toBe(false);
    expect(canUserCancelOrder("activated")).toBe(false);
    expect(canUserCancelOrder("refunded")).toBe(false);
  });

  it("blocks paid software downloads until that software is purchased", () => {
    expect(canDownloadPaidTool({ isDownloadPaid: true, hasDownloadPurchase: false })).toBe(false);
  });

  it("allows free downloads and purchased paid downloads", () => {
    expect(canDownloadPaidTool({ isDownloadPaid: false, hasDownloadPurchase: false })).toBe(true);
    expect(canDownloadPaidTool({ isDownloadPaid: true, hasDownloadPurchase: true })).toBe(true);
  });
});
