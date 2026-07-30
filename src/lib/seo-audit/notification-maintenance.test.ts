import { describe, expect, it, vi } from "vitest";
import { runSeoAuditNotificationMaintenance } from "@/lib/seo-audit/notification-maintenance";

describe("SEO audit notification maintenance", () => {
  it("observes a failed task, continues the cycle, and can recover next cycle", async () => {
    const pendingError = new Error("pending failure query unavailable");
    const notifyPendingCompletions = vi.fn().mockResolvedValue(undefined);
    const notifyPendingFinalFailures = vi
      .fn()
      .mockRejectedValueOnce(pendingError)
      .mockResolvedValueOnce(undefined);
    const notifySubscriptionExpirations = vi.fn().mockResolvedValue(undefined);
    const deliverPendingEmails = vi.fn().mockResolvedValue(undefined);
    const reportError = vi.fn();
    const dependencies = {
      notifyPendingCompletions,
      notifyPendingFinalFailures,
      notifySubscriptionExpirations,
      deliverPendingEmails,
      reportError,
    };

    await expect(
      runSeoAuditNotificationMaintenance(dependencies),
    ).resolves.toEqual({
      pendingCompletions: "completed",
      pendingFinalFailures: "failed",
      subscriptionExpirations: "completed",
      emailOutbox: "completed",
    });
    expect(notifySubscriptionExpirations).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(
      "pendingFinalFailures",
      pendingError,
    );

    await expect(
      runSeoAuditNotificationMaintenance(dependencies),
    ).resolves.toEqual({
      pendingCompletions: "completed",
      pendingFinalFailures: "completed",
      subscriptionExpirations: "completed",
      emailOutbox: "completed",
    });
    expect(notifyPendingCompletions).toHaveBeenCalledTimes(2);
    expect(notifyPendingFinalFailures).toHaveBeenCalledTimes(2);
    expect(notifySubscriptionExpirations).toHaveBeenCalledTimes(2);
    expect(deliverPendingEmails).toHaveBeenCalledTimes(2);
    expect(notifyPendingCompletions).toHaveBeenLastCalledWith({
      deferEmailDelivery: true,
    });
    expect(notifyPendingFinalFailures).toHaveBeenLastCalledWith({
      deferEmailDelivery: true,
    });
    expect(notifySubscriptionExpirations).toHaveBeenLastCalledWith({
      deferEmailDelivery: true,
    });
    expect(deliverPendingEmails).toHaveBeenLastCalledWith({ limit: 1 });
    expect(reportError).toHaveBeenCalledTimes(1);
  });
});
