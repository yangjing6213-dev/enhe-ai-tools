import { describe, expect, it, vi } from "vitest";
import { hashSeoAuditPublicToken } from "@/lib/seo-audit/public-access";
import {
  buildSeoAuditMonitoringOrderCreateData,
  buildSeoAuditOrderCreateData,
  createOrReusePendingSeoAuditOrder,
  loadPurchasableSeoAuditSourceRun,
  loadSeoAuditMonitoringPurchaseSource,
  parseSeoAuditMonitoringPurchaseForm,
  parseSeoAuditPurchaseForm,
} from "@/app/online-tools/seo-geo-audit/purchase";

describe("SEO audit purchase input", () => {
  it("never accepts amount or page limit from the browser", () => {
    const formData = new FormData();
    formData.set("offerCode", "professional");
    formData.set("sourceRunId", "run-1");
    formData.set("publicToken", "public-token-".repeat(3));
    formData.set("paymentMethod", "alipay");
    formData.set("locale", "zh");
    formData.set("csrfToken", "csrf-token");
    formData.set("amount", "0.01");
    formData.set("pageLimit", "9999");

    expect(parseSeoAuditPurchaseForm(formData)).toEqual({
      offerCode: "professional",
      sourceRunId: "run-1",
      publicToken: "public-token-".repeat(3),
      paymentMethod: "alipay",
      locale: "zh",
      csrfToken: "csrf-token",
    });
  });

  it("builds every SEO order field from trusted server records", () => {
    expect(
      buildSeoAuditOrderCreateData({
        orderNo: "ENHE202607270001",
        userId: "user-1",
        sourceRun: {
          id: "run-1",
          normalizedOrigin: "https://example.com",
        },
        offer: {
          id: "offer-professional",
          orderType: "seo_audit_credit",
          price: "9.90",
        },
        paymentMethod: "wechat",
      }),
    ).toEqual({
      orderNo: "ENHE202607270001",
      userId: "user-1",
      seoAuditOfferId: "offer-professional",
      seoAuditTargetOrigin: "https://example.com",
      seoAuditSourceRunId: "run-1",
      orderType: "seo_audit_credit",
      amount: "9.90",
      paymentMethod: "wechat",
      orderStatus: "pending_payment",
    });
  });

  it("accepts only a completed free source run available to the buyer", async () => {
    const token = "public-token-".repeat(3);
    const anonymousRun = {
      id: "run-1",
      userId: null,
      status: "completed",
      kind: "free",
      normalizedOrigin: "https://example.com",
      publicTokenHash: hashSeoAuditPublicToken(token),
      publicTokenExpiresAt: new Date("2026-07-28T00:00:00.000Z"),
    };
    const findUnique = vi.fn().mockResolvedValue(anonymousRun);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = { seoAuditRun: { findUnique, updateMany } };

    await expect(
      loadPurchasableSeoAuditSourceRun(
        {
          runId: "run-1",
          userId: "user-1",
          publicToken: token,
        },
        {
          db,
          now: new Date("2026-07-27T00:00:00.000Z"),
        },
      ),
    ).resolves.toEqual({
      id: "run-1",
      normalizedOrigin: "https://example.com",
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "run-1" },
      select: {
        id: true,
        userId: true,
        status: true,
        kind: true,
        normalizedOrigin: true,
        publicTokenHash: true,
        publicTokenExpiresAt: true,
      },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "run-1",
        userId: null,
        status: "completed",
        kind: "free",
        publicTokenHash: hashSeoAuditPublicToken(token),
        publicTokenExpiresAt: { gt: new Date("2026-07-27T00:00:00.000Z") },
      },
      data: {
        userId: "user-1",
        publicTokenHash: null,
        publicTokenExpiresAt: null,
      },
    });

    findUnique.mockResolvedValueOnce({
      id: "run-1",
      userId: null,
      status: "completed",
      kind: "free",
      normalizedOrigin: "https://example.com",
      publicTokenHash: hashSeoAuditPublicToken(token),
      publicTokenExpiresAt: new Date("2026-07-27T00:00:00.000Z"),
    });
    await expect(
      loadPurchasableSeoAuditSourceRun(
        {
          runId: "run-1",
          userId: "user-1",
          publicToken: token,
        },
        {
          db,
          now: new Date("2026-07-27T00:00:00.000Z"),
        },
      ),
    ).rejects.toThrow("SEO_AUDIT_SOURCE_RUN_UNAVAILABLE");

    findUnique.mockResolvedValueOnce({
      ...anonymousRun,
      userId: "user-1",
      publicTokenHash: null,
      publicTokenExpiresAt: null,
    });
    await expect(
      loadPurchasableSeoAuditSourceRun(
        { runId: "run-1", userId: "user-1", publicToken: "" },
        { db },
      ),
    ).resolves.toEqual({
      id: "run-1",
      normalizedOrigin: "https://example.com",
    });

    findUnique.mockResolvedValueOnce({
      ...anonymousRun,
      userId: "user-2",
      publicTokenHash: null,
      publicTokenExpiresAt: null,
    });
    await expect(
      loadPurchasableSeoAuditSourceRun(
        { runId: "run-1", userId: "user-1", publicToken: token },
        { db },
      ),
    ).rejects.toThrow("SEO_AUDIT_SOURCE_RUN_UNAVAILABLE");

    findUnique
      .mockResolvedValueOnce(anonymousRun)
      .mockResolvedValueOnce({
        ...anonymousRun,
        userId: "user-1",
        publicTokenHash: null,
        publicTokenExpiresAt: null,
      });
    updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      loadPurchasableSeoAuditSourceRun(
        { runId: "run-1", userId: "user-1", publicToken: token },
        { db, now: new Date("2026-07-27T00:00:00.000Z") },
      ),
    ).resolves.toEqual({
      id: "run-1",
      normalizedOrigin: "https://example.com",
    });
  });

  it("allows an already-claimed owner to submit an empty recovery token", () => {
    const formData = new FormData();
    formData.set("offerCode", "professional");
    formData.set("sourceRunId", "run-1");
    formData.set("publicToken", "");
    formData.set("paymentMethod", "alipay");
    formData.set("locale", "zh");
    formData.set("csrfToken", "csrf-token");

    expect(parseSeoAuditPurchaseForm(formData).publicToken).toBe("");
  });

  it("accepts only a server-resolved monitoring source identifier", () => {
    const formData = new FormData();
    formData.set("sourceType", "run");
    formData.set("sourceId", "run-1");
    formData.set("paymentMethod", "wechat");
    formData.set("locale", "en");
    formData.set("csrfToken", "csrf-token");
    formData.set("amount", "0.01");
    formData.set("targetOrigin", "https://attacker.example");

    expect(parseSeoAuditMonitoringPurchaseForm(formData)).toEqual({
      sourceType: "run",
      sourceId: "run-1",
      paymentMethod: "wechat",
      locale: "en",
      csrfToken: "csrf-token",
    });
  });

  it("loads a completed owned run or an owned non-refunded subscription as the monitoring source", async () => {
    const db = {
      seoAuditRun: {
        findUnique: vi.fn().mockResolvedValue({
          id: "run-1",
          userId: "user-1",
          status: "completed",
          normalizedOrigin: "https://example.com",
        }),
      },
      seoAuditSubscription: {
        findUnique: vi.fn().mockResolvedValue({
          id: "subscription-1",
          userId: "user-1",
          status: "paused",
          project: { normalizedOrigin: "https://example.com" },
        }),
      },
    };

    await expect(
      loadSeoAuditMonitoringPurchaseSource(
        { sourceType: "run", sourceId: "run-1", userId: "user-1" },
        { db },
      ),
    ).resolves.toEqual({
      normalizedOrigin: "https://example.com",
      sourceRunId: "run-1",
    });
    await expect(
      loadSeoAuditMonitoringPurchaseSource(
        {
          sourceType: "subscription",
          sourceId: "subscription-1",
          userId: "user-1",
        },
        { db },
      ),
    ).resolves.toEqual({
      normalizedOrigin: "https://example.com",
      sourceRunId: null,
    });

    db.seoAuditRun.findUnique.mockResolvedValueOnce({
      id: "run-1",
      userId: "user-2",
      status: "completed",
      normalizedOrigin: "https://example.com",
    });
    await expect(
      loadSeoAuditMonitoringPurchaseSource(
        { sourceType: "run", sourceId: "run-1", userId: "user-1" },
        { db },
      ),
    ).rejects.toThrow("SEO_AUDIT_MONITORING_SOURCE_UNAVAILABLE");

    db.seoAuditSubscription.findUnique.mockResolvedValueOnce({
      id: "subscription-1",
      userId: "user-1",
      status: "refunded",
      project: { normalizedOrigin: "https://example.com" },
    });
    await expect(
      loadSeoAuditMonitoringPurchaseSource(
        {
          sourceType: "subscription",
          sourceId: "subscription-1",
          userId: "user-1",
        },
        { db },
      ),
    ).rejects.toThrow("SEO_AUDIT_MONITORING_SOURCE_UNAVAILABLE");
  });

  it("builds a monitoring order from trusted offer and source records", () => {
    expect(
      buildSeoAuditMonitoringOrderCreateData({
        orderNo: "ENHE202607270002",
        userId: "user-1",
        source: {
          normalizedOrigin: "https://example.com",
          sourceRunId: "run-1",
        },
        offer: {
          id: "offer-monitoring",
          orderType: "seo_audit_monitoring",
          price: "109.90",
        },
        paymentMethod: "alipay",
      }),
    ).toEqual({
      orderNo: "ENHE202607270002",
      userId: "user-1",
      seoAuditOfferId: "offer-monitoring",
      seoAuditTargetOrigin: "https://example.com",
      seoAuditSourceRunId: "run-1",
      orderType: "seo_audit_monitoring",
      amount: "109.90",
      paymentMethod: "alipay",
      orderStatus: "pending_payment",
    });
  });

  it("reuses a matching pending order after taking the database idempotency lock", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ lockAcquired: true }]),
      order: {
        findFirst: vi.fn().mockResolvedValue({ id: "order-existing" }),
        create: vi.fn(),
      },
    };
    const db = {
      $transaction: async <T>(
        callback: (client: typeof tx) => Promise<T>,
      ) => callback(tx),
    };
    const data = buildSeoAuditMonitoringOrderCreateData({
      orderNo: "ENHE202607270002",
      userId: "user-1",
      source: {
        normalizedOrigin: "https://example.com",
        sourceRunId: "run-1",
      },
      offer: {
        id: "offer-monitoring",
        orderType: "seo_audit_monitoring",
        price: "109.90",
      },
      paymentMethod: "alipay",
    });

    await expect(
      createOrReusePendingSeoAuditOrder(data, { db }),
    ).resolves.toEqual({ id: "order-existing", reused: true });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.order.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        seoAuditOfferId: "offer-monitoring",
        seoAuditTargetOrigin: "https://example.com",
        orderType: "seo_audit_monitoring",
        orderStatus: "pending_payment",
        paymentMethod: "alipay",
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it("creates one pending order when no matching order exists", async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ lockAcquired: true }]),
      order: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "order-new" }),
      },
    };
    const db = {
      $transaction: async <T>(
        callback: (client: typeof tx) => Promise<T>,
      ) => callback(tx),
    };
    const data = buildSeoAuditOrderCreateData({
      orderNo: "ENHE202607270003",
      userId: "user-1",
      sourceRun: {
        id: "run-1",
        normalizedOrigin: "https://example.com",
      },
      offer: {
        id: "offer-professional",
        orderType: "seo_audit_credit",
        price: "9.90",
      },
      paymentMethod: "wechat",
    });

    await expect(
      createOrReusePendingSeoAuditOrder(data, { db }),
    ).resolves.toEqual({ id: "order-new", reused: false });
    expect(tx.order.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        seoAuditOfferId: "offer-professional",
        seoAuditTargetOrigin: "https://example.com",
        seoAuditSourceRunId: "run-1",
        orderType: "seo_audit_credit",
        orderStatus: "pending_payment",
        paymentMethod: "wechat",
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    expect(tx.order.create).toHaveBeenCalledWith({
      data,
      select: { id: true },
    });
  });
});
