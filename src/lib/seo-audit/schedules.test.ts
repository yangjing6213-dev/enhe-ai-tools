import { describe, expect, it, vi } from "vitest";
import {
  parseSeoAuditScheduleInput,
  resolveNextSeoAuditScheduleAt,
  updateOwnedSeoAuditSchedule,
} from "@/lib/seo-audit/schedules";

describe("SEO audit monitoring schedules", () => {
  it.each(["weekly", "biweekly", "monthly"] as const)(
    "accepts the supported %s cadence",
    (cadence) => {
      expect(
        parseSeoAuditScheduleInput({
          cadence,
          weekday: 2,
          hour: 9,
          minute: 30,
          enabled: true,
          notificationEmail: "  alerts@example.com  ",
        }),
      ).toEqual({
        cadence,
        weekday: 2,
        hour: 9,
        minute: 30,
        enabled: true,
        notificationEmail: "alerts@example.com",
      });
    },
  );

  it("allows notifications to be disabled with an empty address", () => {
    expect(
      parseSeoAuditScheduleInput({
        cadence: "weekly",
        weekday: 2,
        hour: 9,
        minute: 0,
        enabled: true,
        notificationEmail: "   ",
      }),
    ).toMatchObject({ notificationEmail: null });
  });

  it.each([
    { cadence: "daily", weekday: 2, hour: 9, minute: 0 },
    { cadence: "weekly", weekday: 7, hour: 9, minute: 0 },
    { cadence: "weekly", weekday: 2, hour: 24, minute: 0 },
    { cadence: "weekly", weekday: 2, hour: 9, minute: 60 },
    {
      cadence: "weekly",
      weekday: 2,
      hour: 9,
      minute: 0,
      enabled: true,
      notificationEmail: "not-an-email",
    },
  ])("rejects unsupported schedule input %#", (input) => {
    expect(() => parseSeoAuditScheduleInput(input)).toThrow("INVALID_SCHEDULE");
  });

  it("computes the next weekly run in Asia/Shanghai without returning the past", () => {
    const next = resolveNextSeoAuditScheduleAt(
      { cadence: "weekly", weekday: 1, hour: 9, minute: 0, enabled: true },
      new Date("2026-07-26T08:00:00.000Z"),
    );
    expect(next?.toISOString()).toBe("2026-07-27T01:00:00.000Z");
  });

  it("returns null while a schedule is paused", () => {
    expect(
      resolveNextSeoAuditScheduleAt(
        { cadence: "monthly", weekday: 1, hour: 9, minute: 0, enabled: false },
        new Date("2026-07-26T08:00:00.000Z"),
      ),
    ).toBeNull();
  });

  it("updates only the authenticated user's existing active subscription plan", async () => {
    const trackEvent = vi.fn().mockResolvedValue(undefined);
    const tx = {
      seoAuditSubscription: {
        findFirst: vi.fn().mockResolvedValue({
          id: "subscription-1",
          schedule: { enabled: false },
        }),
        update: vi.fn().mockResolvedValue({ id: "subscription-1" }),
      },
      seoAuditSchedule: {
        update: vi.fn().mockResolvedValue({ id: "schedule-1" }),
      },
    };
    const db = {
      $transaction: vi.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const now = new Date("2026-07-26T08:00:00.000Z");

    await expect(
      updateOwnedSeoAuditSchedule(
        {
          userId: "user-1",
          subscriptionId: "subscription-1",
          schedule: {
            cadence: "biweekly",
            weekday: 1,
            hour: 9,
            minute: 0,
            enabled: true,
            notificationEmail: "alerts@example.com",
          },
        },
        { db: db as never, now, trackEvent },
      ),
    ).resolves.toEqual({ scheduleId: "schedule-1" });

    expect(tx.seoAuditSubscription.findFirst).toHaveBeenCalledWith({
      where: {
        id: "subscription-1",
        userId: "user-1",
        status: { in: ["active", "paused"] },
        expiresAt: { gt: now },
      },
      select: { id: true, schedule: { select: { enabled: true } } },
    });
    expect(tx.seoAuditSchedule.update).toHaveBeenCalledWith({
      where: { subscriptionId: "subscription-1" },
      data: {
        cadence: "biweekly",
        weekday: 1,
        hour: 9,
        minute: 0,
        timeZone: "Asia/Shanghai",
        enabled: true,
        notificationEmail: "alerts@example.com",
        nextRunAt: new Date("2026-07-27T01:00:00.000Z"),
      },
      select: { id: true },
    });
    expect(tx.seoAuditSubscription.update).toHaveBeenCalledWith({
      where: { id: "subscription-1" },
      data: { status: "active" },
      select: { id: true },
    });
    expect(trackEvent).toHaveBeenCalledWith({
      eventName: "seo_audit_schedule_enabled",
      entityType: "seo_audit_subscription",
      entityId: "subscription-1",
      userId: "user-1",
      metadata: { cadence: "biweekly" },
    });
  });

  it("does not duplicate an enable event when only schedule details change", async () => {
    const trackEvent = vi.fn().mockResolvedValue(undefined);
    const tx = {
      seoAuditSubscription: {
        findFirst: vi.fn().mockResolvedValue({
          id: "subscription-1",
          schedule: { enabled: true },
        }),
        update: vi.fn().mockResolvedValue({ id: "subscription-1" }),
      },
      seoAuditSchedule: {
        update: vi.fn().mockResolvedValue({ id: "schedule-1" }),
      },
    };
    const db = {
      $transaction: vi.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    await updateOwnedSeoAuditSchedule(
      {
        userId: "user-1",
        subscriptionId: "subscription-1",
        schedule: {
          cadence: "weekly",
          weekday: 3,
          hour: 10,
          minute: 0,
          enabled: true,
          notificationEmail: "alerts@example.com",
        },
      },
      {
        db: db as never,
        now: new Date("2026-07-26T08:00:00.000Z"),
        trackEvent,
      },
    );

    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("rejects another user's or expired subscription without mutating a plan", async () => {
    const tx = {
      seoAuditSubscription: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      seoAuditSchedule: { update: vi.fn() },
    };
    const db = {
      $transaction: vi.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    await expect(
      updateOwnedSeoAuditSchedule(
        {
          userId: "user-2",
          subscriptionId: "subscription-1",
          schedule: {
            cadence: "weekly",
            weekday: 1,
            hour: 9,
            minute: 0,
            enabled: false,
            notificationEmail: "alerts@example.com",
          },
        },
        { db: db as never, now: new Date("2026-07-26T08:00:00.000Z") },
      ),
    ).rejects.toThrow("SCHEDULE_UNAVAILABLE");
    expect(tx.seoAuditSubscription.update).not.toHaveBeenCalled();
    expect(tx.seoAuditSchedule.update).not.toHaveBeenCalled();
  });
});
