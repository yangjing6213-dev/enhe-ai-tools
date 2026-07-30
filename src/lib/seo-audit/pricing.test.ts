import { describe, expect, it, vi } from "vitest";
import {
  countValidProfessionalLaunchSales,
  resolveSeoAuditMonitoringOffer,
  resolveSeoAuditPaidOffer,
} from "@/lib/seo-audit/pricing";

function decimal(value: string) {
  return { toString: () => value };
}

function createPricingDb() {
  return {
    seoAuditOffer: {
      findUnique: vi.fn(),
    },
    order: {
      count: vi.fn(),
    },
  };
}

describe("SEO audit database pricing", () => {
  it("counts only non-test paid or activated orders without pending or completed refunds", async () => {
    const db = createPricingDb();
    db.order.count.mockResolvedValue(7);

    await expect(
      countValidProfessionalLaunchSales("offer-professional", db),
    ).resolves.toBe(7);
    expect(db.order.count).toHaveBeenCalledWith({
      where: {
        seoAuditOfferId: "offer-professional",
        isTestData: false,
        orderStatus: { in: ["paid", "activated"] },
        refundRecords: {
          none: { status: { in: ["pending", "completed"] } },
        },
      },
    });
  });

  it("uses the active database offer and launch price before both limits", async () => {
    const db = createPricingDb();
    db.seoAuditOffer.findUnique.mockResolvedValue({
      id: "offer-professional",
      code: "professional",
      name: "Professional Audit",
      nameEn: "Professional Audit",
      orderType: "seo_audit_credit",
      regularPrice: decimal("19.90"),
      launchPrice: decimal("9.90"),
      launchEndsAt: new Date("2026-08-23T16:00:00.000Z"),
      launchQuantityLimit: 100,
      pageLimit: 100,
      includedRuns: 2,
      validityDays: 7,
      status: "active",
    });
    db.order.count.mockResolvedValue(99);

    await expect(
      resolveSeoAuditPaidOffer("professional", {
        db,
        now: new Date("2026-07-27T00:00:00.000Z"),
      }),
    ).resolves.toEqual({
      id: "offer-professional",
      code: "professional",
      name: "Professional Audit",
      nameEn: "Professional Audit",
      orderType: "seo_audit_credit",
      price: "9.90",
      regularPrice: "19.90",
      isLaunchPrice: true,
      pageLimit: 100,
      includedRuns: 2,
      validityDays: 7,
    });
    expect(db.seoAuditOffer.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: "professional" },
      }),
    );
  });

  it("falls back to the database regular price after the launch quantity is reached", async () => {
    const db = createPricingDb();
    db.seoAuditOffer.findUnique.mockResolvedValue({
      id: "offer-professional",
      code: "professional",
      name: "Professional Audit",
      nameEn: "Professional Audit",
      orderType: "seo_audit_credit",
      regularPrice: decimal("19.90"),
      launchPrice: decimal("9.90"),
      launchEndsAt: new Date("2026-08-23T16:00:00.000Z"),
      launchQuantityLimit: 100,
      pageLimit: 100,
      includedRuns: 2,
      validityDays: 7,
      status: "active",
    });
    db.order.count.mockResolvedValue(100);

    const offer = await resolveSeoAuditPaidOffer("professional", {
      db,
      now: new Date("2026-07-27T00:00:00.000Z"),
    });

    expect(offer.price).toBe("19.90");
    expect(offer.isLaunchPrice).toBe(false);
  });

  it("rejects inactive, missing, monitoring, or misconfigured paid offers", async () => {
    const db = createPricingDb();
    db.seoAuditOffer.findUnique.mockResolvedValue(null);
    await expect(
      resolveSeoAuditPaidOffer("professional", { db }),
    ).rejects.toThrow("SEO_AUDIT_OFFER_UNAVAILABLE");

    await expect(
      resolveSeoAuditPaidOffer("monitoring" as "professional", { db }),
    ).rejects.toThrow("SEO_AUDIT_OFFER_UNAVAILABLE");
  });

  it("resolves the monitoring offer only from the active server record", async () => {
    const db = createPricingDb();
    db.seoAuditOffer.findUnique.mockResolvedValue({
      id: "offer-monitoring",
      code: "monitoring",
      name: "30 天持续监控",
      nameEn: "30-Day Monitoring",
      orderType: "seo_audit_monitoring",
      regularPrice: decimal("109.90"),
      launchPrice: null,
      launchEndsAt: null,
      launchQuantityLimit: null,
      pageLimit: 100,
      includedRuns: null,
      validityDays: 30,
      maxScheduledRuns: 5,
      manualRuns: 2,
      status: "active",
    });

    await expect(
      resolveSeoAuditMonitoringOffer({ db, salesEnabled: true }),
    ).resolves.toEqual({
      id: "offer-monitoring",
      code: "monitoring",
      name: "30 天持续监控",
      nameEn: "30-Day Monitoring",
      orderType: "seo_audit_monitoring",
      price: "109.90",
      pageLimit: 100,
      validityDays: 30,
      maxScheduledRuns: 5,
      manualRuns: 2,
    });
    expect(db.seoAuditOffer.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: "monitoring" } }),
    );
  });

  it("rejects a monitoring record with invalid service limits", async () => {
    const db = createPricingDb();
    db.seoAuditOffer.findUnique.mockResolvedValue({
      id: "offer-monitoring",
      code: "monitoring",
      name: "30 天持续监控",
      nameEn: "30-Day Monitoring",
      orderType: "seo_audit_monitoring",
      regularPrice: decimal("109.90"),
      launchPrice: null,
      launchEndsAt: null,
      launchQuantityLimit: null,
      pageLimit: 100,
      includedRuns: null,
      validityDays: 30,
      maxScheduledRuns: 0,
      manualRuns: 2,
      status: "active",
    });

    await expect(
      resolveSeoAuditMonitoringOffer({ db, salesEnabled: true }),
    ).rejects.toThrow("SEO_AUDIT_OFFER_UNAVAILABLE");
  });

  it("keeps monitoring sales closed until the production acceptance gate opens", async () => {
    const db = createPricingDb();

    await expect(
      resolveSeoAuditMonitoringOffer({ db, salesEnabled: false }),
    ).rejects.toThrow("SEO_AUDIT_MONITORING_SALES_DISABLED");
    expect(db.seoAuditOffer.findUnique).not.toHaveBeenCalled();
  });
});
