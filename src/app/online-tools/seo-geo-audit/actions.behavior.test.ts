import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertCsrf: vi.fn(),
  createOrReuseOrder: vi.fn(),
  createOrder: vi.fn(),
  getCurrentUser: vi.fn(),
  loadSource: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  resolveOffer: vi.fn(),
  track: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/csrf", () => ({ assertValidCsrfToken: mocks.assertCsrf }));
vi.mock("@/lib/db", () => ({
  prisma: { order: { create: mocks.createOrder } },
}));
vi.mock("@/lib/order", () => ({
  createOrderNo: () => "ENHE202607270001",
}));
vi.mock("@/lib/seo-audit/pricing", () => ({
  resolveSeoAuditPaidOffer: mocks.resolveOffer,
}));
vi.mock("./purchase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./purchase")>()),
  createOrReusePendingSeoAuditOrder: mocks.createOrReuseOrder,
  loadPurchasableSeoAuditSourceRun: mocks.loadSource,
}));
vi.mock("./events", () => ({
  trackSeoAuditProductEvent: mocks.track,
}));

import { purchaseSeoAuditAction } from "./actions";

function purchaseForm(locale: "zh" | "en" = "zh") {
  const formData = new FormData();
  formData.set("offerCode", "professional");
  formData.set("sourceRunId", "run-1");
  formData.set("publicToken", "public-token-".repeat(3));
  formData.set("paymentMethod", "alipay");
  formData.set("locale", locale);
  formData.set("csrfToken", "csrf-token");
  formData.set("amount", "0.01");
  formData.set("pageLimit", "9999");
  return formData;
}

describe("purchaseSeoAuditAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.resolveOffer.mockResolvedValue({
      id: "offer-professional",
      code: "professional",
      orderType: "seo_audit_credit",
      price: "9.90",
    });
    mocks.loadSource.mockResolvedValue({
      id: "run-1",
      normalizedOrigin: "https://example.com",
    });
    mocks.createOrder.mockResolvedValue({ id: "order-1" });
    mocks.createOrReuseOrder.mockResolvedValue({
      id: "order-1",
      reused: false,
    });
    mocks.track.mockResolvedValue(undefined);
  });

  it("creates a pending order entirely from trusted server records", async () => {
    await expect(purchaseSeoAuditAction(purchaseForm())).rejects.toThrow(
      "NEXT_REDIRECT:/orders/order-1/pay",
    );

    expect(mocks.assertCsrf).toHaveBeenCalledWith("csrf-token");
    expect(mocks.resolveOffer).toHaveBeenCalledWith("professional");
    expect(mocks.loadSource).toHaveBeenCalledWith({
      runId: "run-1",
      userId: "user-1",
      publicToken: "public-token-".repeat(3),
    });
    expect(mocks.createOrReuseOrder).toHaveBeenCalledWith({
      orderNo: "ENHE202607270001",
      userId: "user-1",
      seoAuditOfferId: "offer-professional",
      seoAuditTargetOrigin: "https://example.com",
      seoAuditSourceRunId: "run-1",
      orderType: "seo_audit_credit",
      amount: "9.90",
      paymentMethod: "alipay",
      orderStatus: "pending_payment",
    });
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.track).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "seo_audit_checkout_started",
        entityId: "order-1",
      }),
    );
  });

  it("redirects unauthenticated users back to the localized product run", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(purchaseSeoAuditAction(purchaseForm("en"))).rejects.toThrow(
      "NEXT_REDIRECT:/en/login?returnTo=%2Fen%2Fonline-tools%2Fseo-geo-audit%3Frun%3Drun-1",
    );
    expect(mocks.resolveOffer).not.toHaveBeenCalled();
    expect(mocks.createOrReuseOrder).not.toHaveBeenCalled();
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });
});
