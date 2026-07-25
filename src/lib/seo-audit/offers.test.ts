import { describe, expect, it } from "vitest";
import {
  SEO_AUDIT_LAUNCH_END_AT,
  SEO_AUDIT_LAUNCH_START_AT,
  resolveSeoAuditOffer,
} from "@/lib/seo-audit/offers";

describe("SEO audit offers", () => {
  it("keeps free audit limits on the server when clients send larger values", () => {
    const offer = resolveSeoAuditOffer(
      {
        code: "free",
        price: 0.01,
        pageLimit: 300,
        includedRuns: 99,
      },
      { now: new Date("2026-07-25T00:00:00.000Z"), professionalLaunchSales: 0 },
    );

    expect(offer).toMatchObject({
      code: "free",
      orderType: null,
      price: 0,
      pageLimit: 10,
      includedRuns: 1,
      validityDays: 1,
      publicFindingLimit: 3,
    });
  });

  it("uses 9.9 for professional launch sales before either promotion limit", () => {
    const offer = resolveSeoAuditOffer(
      { code: "professional", price: 0.01, pageLimit: 1 },
      {
        now: new Date(SEO_AUDIT_LAUNCH_END_AT.getTime() - 1),
        professionalLaunchSales: 99,
      },
    );

    expect(offer).toMatchObject({
      code: "professional",
      orderType: "seo_audit_credit",
      price: 9.9,
      regularPrice: 19.9,
      pageLimit: 100,
      includedRuns: 2,
      validityDays: 7,
    });
  });

  it("uses 19.9 when the professional quantity limit is reached", () => {
    const offer = resolveSeoAuditOffer(
      { code: "professional" },
      {
        now: new Date(SEO_AUDIT_LAUNCH_END_AT.getTime() - 1),
        professionalLaunchSales: 100,
      },
    );

    expect(offer.price).toBe(19.9);
  });

  it("uses 19.9 when the professional launch period has ended", () => {
    const offer = resolveSeoAuditOffer(
      { code: "professional" },
      { now: SEO_AUDIT_LAUNCH_END_AT, professionalLaunchSales: 0 },
    );

    expect(offer.price).toBe(19.9);
  });

  it("does not activate the launch price before the launch period starts", () => {
    const offer = resolveSeoAuditOffer(
      { code: "professional" },
      {
        now: new Date(SEO_AUDIT_LAUNCH_START_AT.getTime() - 1),
        professionalLaunchSales: 0,
      },
    );

    expect(offer.price).toBe(19.9);
  });

  it("keeps deep and monitoring limits independent from client input", () => {
    const context = {
      now: new Date("2026-07-25T00:00:00.000Z"),
      professionalLaunchSales: 0,
    };

    expect(
      resolveSeoAuditOffer(
        { code: "deep", price: 1, pageLimit: 10, includedRuns: 1 },
        context,
      ),
    ).toMatchObject({
      code: "deep",
      orderType: "seo_audit_credit",
      price: 39.9,
      pageLimit: 300,
      includedRuns: 3,
      validityDays: 30,
    });

    expect(
      resolveSeoAuditOffer(
        {
          code: "monitoring",
          price: 1,
          pageLimit: 300,
          maxScheduledRuns: 100,
          manualRuns: 100,
        },
        context,
      ),
    ).toMatchObject({
      code: "monitoring",
      orderType: "seo_audit_monitoring",
      price: 109.9,
      pageLimit: 100,
      maxScheduledRuns: 5,
      manualRuns: 2,
      validityDays: 30,
    });
  });

  it("rejects unknown offer codes", () => {
    expect(() =>
      resolveSeoAuditOffer(
        { code: "agency", pageLimit: 10 },
        { now: new Date(), professionalLaunchSales: 0 },
      ),
    ).toThrow("Unsupported SEO audit offer");
  });
});
