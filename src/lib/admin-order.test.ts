import { describe, expect, it } from "vitest";
import { buildAdminOrderPageHref, parseAdminOrderListParams, getOrderTimestampPatch } from "@/lib/admin-order";

describe("getOrderTimestampPatch", () => {
  it("sets paidAt for paid orders", () => {
    expect(getOrderTimestampPatch("paid", null, null).paidAt).toBeInstanceOf(Date);
  });

  it("sets paidAt and activatedAt for activated orders", () => {
    const patch = getOrderTimestampPatch("activated", null, null);

    expect(patch.paidAt).toBeInstanceOf(Date);
    expect(patch.activatedAt).toBeInstanceOf(Date);
  });

  it("keeps existing timestamps", () => {
    const paidAt = new Date("2026-01-01T00:00:00Z");
    const activatedAt = new Date("2026-01-02T00:00:00Z");

    expect(getOrderTimestampPatch("activated", paidAt, activatedAt)).toEqual({ paidAt, activatedAt });
  });

  it("does not set timestamps for cancelled orders", () => {
    expect(getOrderTimestampPatch("cancelled", null, null)).toEqual({});
  });

  it("parses admin order list filters with safe pagination", () => {
    expect(parseAdminOrderListParams({ q: "  ENHE2026  ", status: "pending_review", page: "3" })).toEqual({
      q: "ENHE2026",
      status: "pending_review",
      page: 3,
      pageSize: 20,
      skip: 40,
      take: 20
    });

    expect(parseAdminOrderListParams({ status: "activated", page: "-1" })).toMatchObject({
      status: undefined,
      page: 1,
      skip: 0
    });
  });

  it("builds admin order page links while keeping filters", () => {
    expect(buildAdminOrderPageHref({ q: "ENHE", status: "rejected" }, 2)).toBe(
      "/admin/orders?q=ENHE&status=rejected&page=2"
    );
    expect(buildAdminOrderPageHref({ q: "", status: undefined }, 1)).toBe("/admin/orders?page=1");
  });
});
