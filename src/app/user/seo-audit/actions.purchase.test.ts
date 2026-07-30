import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertCsrf: vi.fn(),
  createOrReuseOrder: vi.fn(),
  loadMonitoringSource: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
  resolveMonitoringOffer: vi.fn(),
  track: vi.fn(),
  updateSchedule: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/csrf", () => ({ assertValidCsrfToken: mocks.assertCsrf }));
vi.mock("@/lib/order", () => ({
  createOrderNo: () => "ENHE202607270004",
}));
vi.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: mocks.track }));
vi.mock("@/lib/seo-audit/entitlements", () => ({
  consumeSeoAuditCreditAndEnqueue: vi.fn(),
  consumeSeoAuditSubscriptionManualRunAndEnqueue: vi.fn(),
}));
vi.mock("@/lib/seo-audit/schedules", () => ({
  updateOwnedSeoAuditSchedule: mocks.updateSchedule,
}));
vi.mock("@/lib/seo-audit/pricing", () => ({
  resolveSeoAuditMonitoringOffer: mocks.resolveMonitoringOffer,
}));
vi.mock(
  "@/app/online-tools/seo-geo-audit/purchase",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/app/online-tools/seo-geo-audit/purchase")
    >()),
    createOrReusePendingSeoAuditOrder: mocks.createOrReuseOrder,
    loadSeoAuditMonitoringPurchaseSource: mocks.loadMonitoringSource,
  }),
);

import {
  purchaseSeoAuditMonitoringAction,
  updateSeoAuditScheduleAction,
} from "@/app/user/seo-audit/actions";

function monitoringPurchaseForm(locale: "zh" | "en" = "zh") {
  const formData = new FormData();
  formData.set("sourceType", "run");
  formData.set("sourceId", "run-1");
  formData.set("paymentMethod", "alipay");
  formData.set("locale", locale);
  formData.set("csrfToken", "csrf-token");
  formData.set("amount", "0.01");
  formData.set("targetOrigin", "https://attacker.example");
  return formData;
}

describe("purchaseSeoAuditMonitoringAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
    mocks.resolveMonitoringOffer.mockResolvedValue({
      id: "offer-monitoring",
      code: "monitoring",
      orderType: "seo_audit_monitoring",
      price: "109.90",
    });
    mocks.loadMonitoringSource.mockResolvedValue({
      normalizedOrigin: "https://example.com",
      sourceRunId: "run-1",
    });
    mocks.createOrReuseOrder.mockResolvedValue({
      id: "order-monitoring",
      reused: false,
    });
    mocks.track.mockResolvedValue(undefined);
  });

  it("creates a server-priced manual-renewal order for an owned source", async () => {
    await expect(
      purchaseSeoAuditMonitoringAction(monitoringPurchaseForm()),
    ).rejects.toThrow("NEXT_REDIRECT:/orders/order-monitoring/pay");

    expect(mocks.assertCsrf).toHaveBeenCalledWith("csrf-token");
    expect(mocks.resolveMonitoringOffer).toHaveBeenCalledWith();
    expect(mocks.loadMonitoringSource).toHaveBeenCalledWith({
      sourceType: "run",
      sourceId: "run-1",
      userId: "user-1",
    });
    expect(mocks.createOrReuseOrder).toHaveBeenCalledWith({
      orderNo: "ENHE202607270004",
      userId: "user-1",
      seoAuditOfferId: "offer-monitoring",
      seoAuditTargetOrigin: "https://example.com",
      seoAuditSourceRunId: "run-1",
      orderType: "seo_audit_monitoring",
      amount: "109.90",
      paymentMethod: "alipay",
      orderStatus: "pending_payment",
    });
    expect(mocks.track).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "seo_audit_checkout_started",
        entityType: "order",
        entityId: "order-monitoring",
        userId: "user-1",
        metadata: expect.objectContaining({ offerCode: "monitoring" }),
      }),
    );
  });
});

describe("updateSeoAuditScheduleAction", () => {
  it("passes the editable notification address through schedule validation", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
    mocks.updateSchedule.mockResolvedValue({ scheduleId: "schedule-1" });
    const formData = new FormData();
    formData.set("locale", "en");
    formData.set("subscriptionId", "subscription-1");
    formData.set("cadence", "weekly");
    formData.set("weekday", "2");
    formData.set("hour", "9");
    formData.set("minute", "0");
    formData.set("enabled", "true");
    formData.set("notificationEmail", "alerts@example.com");

    await updateSeoAuditScheduleAction(formData);

    expect(mocks.updateSchedule).toHaveBeenCalledWith({
      userId: "user-1",
      subscriptionId: "subscription-1",
      schedule: {
        cadence: "weekly",
        weekday: 2,
        hour: 9,
        minute: 0,
        enabled: true,
        notificationEmail: "alerts@example.com",
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/user/seo-audit");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/en/user/seo-audit");
  });
});
