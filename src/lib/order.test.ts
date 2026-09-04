import { describe, expect, it } from "vitest";
import { createOrderNo } from "@/lib/order";

describe("createOrderNo", () => {
  it("creates an ENHE order number with timestamp and six digit suffix", () => {
    const orderNo = createOrderNo(new Date("2026-05-18T09:08:07"), 0.123456);
    expect(orderNo).toBe("ENHE20260518090807123456");
  });
});
