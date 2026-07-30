import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSeoAuditMonitoringEmail,
  getSeoAuditNotificationEmailConfig,
  notifySeoAuditPendingCompletions,
  notifySeoAuditRunCompletion,
  notifySeoAuditRunFailure,
  notifySeoAuditSubscriptionExpirations,
  sendSeoAuditMonitoringEvent,
} from "@/lib/email-seo-audit-notifications";

const now = new Date("2026-07-27T00:00:00.000Z");
const enabledConfig = {
  enabled: true as const,
  host: "smtp.example.com",
  port: 587,
  secure: false,
  from: "SEO Audit <audit@example.com>",
};

function createMailer() {
  return { sendMail: vi.fn().mockResolvedValue({ messageId: "message-1" }) };
}

function claimedOutboxRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "seo-audit:summary:run-1",
    notificationId: "seo-audit:summary:run-1",
    recipient: "owner@example.com",
    subject: "Monitoring completed",
    textBody: "Monitoring completed",
    htmlBody: "<p>Monitoring completed</p>",
    leaseToken: "lease-1",
    attemptCount: 1,
    maxAttempts: 5,
    ...overrides,
  };
}

function createDb(input: {
  run?: Record<string, unknown> | null;
  previousRun?: Record<string, unknown> | null;
  subscriptions?: Array<Record<string, unknown>>;
  notificationCreateMany?: ReturnType<typeof vi.fn>;
  outboxCreateMany?: ReturnType<typeof vi.fn>;
  queryRaw?: ReturnType<typeof vi.fn>;
}) {
  const db = {
    seoAuditRun: {
      findUnique: vi.fn().mockResolvedValue(input.run ?? null),
      findFirst: vi.fn().mockResolvedValue(input.previousRun ?? null),
      findMany: vi
        .fn()
        .mockResolvedValue(input.run ? [{ id: input.run.id }] : []),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    seoAuditSubscription: {
      findMany: vi.fn().mockResolvedValue(input.subscriptions ?? []),
    },
    notification: {
      createMany:
        input.notificationCreateMany ??
        vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue({
        user: {
          email: "owner@example.com",
          newsletterEmail: null,
          acceptEmailUpdates: true,
        },
      }),
    },
    seoAuditEmailOutbox: {
      createMany:
        input.outboxCreateMany ?? vi.fn().mockResolvedValue({ count: 1 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $queryRaw:
      input.queryRaw ?? vi.fn().mockResolvedValue([claimedOutboxRow()]),
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation(async (callback) => callback(db));
  return db;
}

function completedRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-current",
    status: "completed",
    kind: "scheduled",
    targetUrl: "https://example.com",
    userId: "user-1",
    projectId: "project-1",
    subscriptionId: "subscription-1",
    engineVersion: "1.4.8",
    summaryScore: 74,
    summaryEvidenceCoverage: 81,
    summaryFindings: [
      { id: "canonical", severity: "medium", issue: "Missing canonical" },
      { id: "robots-block", severity: "high", issue: "Robots blocks AI bots" },
    ],
    completedAt: new Date("2026-07-27T00:00:00.000Z"),
    failedAt: null,
    failureCode: null,
    failureMessage: null,
    completionNotificationPreparedAt: null,
    user: {
      id: "user-1",
      email: "owner@example.com",
      newsletterEmail: null,
      acceptEmailUpdates: true,
    },
    project: { id: "project-1", normalizedOrigin: "https://example.com" },
    subscription: {
      id: "subscription-1",
      expiresAt: new Date("2026-08-26T00:00:00.000Z"),
      schedule: { notificationEmail: "monitoring@example.com" },
    },
    ...overrides,
  };
}

function previousRun(overrides: Record<string, unknown> = {}) {
  return completedRun({
    id: "run-previous",
    summaryScore: 90,
    summaryEvidenceCoverage: 80,
    summaryFindings: [
      { id: "canonical", severity: "medium", issue: "Missing canonical" },
    ],
    completedAt: new Date("2026-07-20T00:00:00.000Z"),
    ...overrides,
  });
}

describe("SEO audit notification email config", () => {
  it("stays disabled when explicitly disabled or SMTP settings are missing", () => {
    expect(
      getSeoAuditNotificationEmailConfig({
        SEO_AUDIT_EMAIL_NOTIFICATIONS_ENABLED: "false",
      }),
    ).toMatchObject({ enabled: false });

    expect(getSeoAuditNotificationEmailConfig({})).toMatchObject({
      enabled: false,
      skipReason: "missing SMTP config",
    });
  });

  it("builds user-facing monitoring email content without private run fields", () => {
    const email = buildSeoAuditMonitoringEmail({
      eventType: "severe_regression",
      targetOrigin: "https://example.com",
      score: 74,
      scoreDelta: -16,
      newSevereFindingIds: ["robots-block"],
      linkUrl: "/user/seo-audit?subscriptionId=subscription-1",
    });

    expect(email.subject).toContain("SEO/GEO monitoring alert");
    expect(email.text).toContain("https://example.com");
    expect(email.text).toContain("robots-block");
    expect(email.text).not.toContain("leaseToken");
    expect(email.html).toContain("SEO/GEO monitoring alert");
  });
});

describe("SEO audit monitoring notification delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists an in-app notification but skips SMTP when email is disabled", async () => {
    const mailer = createMailer();
    const db = createDb({});

    const result = await sendSeoAuditMonitoringEvent(
      {
        notificationId: "seo-audit:summary:run-1",
        userId: "user-1",
        recipientEmail: "owner@example.com",
        type: "seo_audit_monitoring_summary",
        title: "Monitoring completed",
        content: "Your scheduled SEO/GEO audit finished.",
        linkUrl: "/user/seo-audit?subscriptionId=subscription-1",
        email: buildSeoAuditMonitoringEmail({
          eventType: "completion_summary",
          targetOrigin: "https://example.com",
          score: 88,
          scoreDelta: 3,
          linkUrl: "/user/seo-audit?subscriptionId=subscription-1",
        }),
      },
      {
        db: db as never,
        mailer: mailer as never,
        config: { enabled: false, secure: false, skipReason: "test disabled" },
      },
    );

    expect(result).toEqual({ created: true, emailed: false });
    expect(db.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: "seo-audit:summary:run-1",
          userId: "user-1",
        }),
      ],
      skipDuplicates: true,
    });
    expect(mailer.sendMail).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(db.seoAuditEmailOutbox.updateMany).not.toHaveBeenCalled();
  });

  it("can persist for deferred maintenance delivery without calling SMTP", async () => {
    const mailer = createMailer();
    const queryRaw = vi.fn().mockResolvedValue([claimedOutboxRow()]);
    const db = createDb({ queryRaw });

    const result = await sendSeoAuditMonitoringEvent(
      {
        notificationId: "seo-audit:summary:run-deferred",
        userId: "user-1",
        recipientEmail: "owner@example.com",
        type: "seo_audit_monitoring_summary",
        title: "Monitoring completed",
        content: "Your scheduled SEO/GEO audit finished.",
        linkUrl: "/user/seo-audit?subscriptionId=subscription-1",
        email: buildSeoAuditMonitoringEmail({
          eventType: "completion_summary",
          targetOrigin: "https://example.com",
          score: 88,
          linkUrl: "/user/seo-audit?subscriptionId=subscription-1",
        }),
      },
      {
        db: db as never,
        mailer: mailer as never,
        config: enabledConfig,
        deferEmailDelivery: true,
        now,
      },
    );

    expect(result).toEqual({ created: true, emailed: false });
    expect(db.seoAuditEmailOutbox.createMany).toHaveBeenCalledTimes(1);
    expect(queryRaw).not.toHaveBeenCalled();
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it("sends a scheduled summary and a severe alert for changed high-risk findings", async () => {
    const mailer = createMailer();
    const db = createDb({ run: completedRun(), previousRun: previousRun() });

    const result = await notifySeoAuditRunCompletion("run-current", {
      db: db as never,
      mailer: mailer as never,
      config: enabledConfig,
      now,
    });

    expect(result).toEqual({ attempted: 2, sent: 2, skipped: 0 });
    expect(db.notification.createMany).toHaveBeenCalledTimes(2);
    expect(
      db.notification.createMany.mock.calls.map(([input]) => input.data[0].id),
    ).toEqual([
      "seo-audit:completion-summary:run-current",
      "seo-audit:severe-regression:run-current",
    ]);
    expect(mailer.sendMail).toHaveBeenCalledTimes(2);
    expect(
      db.seoAuditEmailOutbox.createMany.mock.calls.map(
        ([input]) => input.data[0].recipient,
      ),
    ).toEqual(["monitoring@example.com", "monitoring@example.com"]);
  });

  it("uses the plan address despite marketing opt-out and falls back to the account address", async () => {
    const mailer = createMailer();
    const planDb = createDb({
      run: completedRun({
        user: {
          id: "user-1",
          email: "owner@example.com",
          newsletterEmail: "marketing@example.com",
          acceptEmailUpdates: false,
        },
      }),
      previousRun: null,
    });

    await notifySeoAuditRunCompletion("run-current", {
      db: planDb as never,
      mailer: mailer as never,
      config: enabledConfig,
      deferEmailDelivery: true,
      now,
    });
    expect(
      planDb.seoAuditEmailOutbox.createMany.mock.calls[0][0].data[0].recipient,
    ).toBe("monitoring@example.com");

    const fallbackDb = createDb({
      run: completedRun({
        subscription: {
          id: "subscription-1",
          expiresAt: new Date("2026-08-26T00:00:00.000Z"),
          schedule: { notificationEmail: null },
        },
      }),
      previousRun: null,
    });
    await notifySeoAuditRunCompletion("run-current", {
      db: fallbackDb as never,
      mailer: mailer as never,
      config: enabledConfig,
      deferEmailDelivery: true,
      now,
    });
    expect(
      fallbackDb.seoAuditEmailOutbox.createMany.mock.calls[0][0].data[0]
        .recipient,
    ).toBe("owner@example.com");
  });

  it("rescans completed scheduled runs when the original process crashed before notification persistence", async () => {
    const mailer = createMailer();
    const db = createDb({ run: completedRun(), previousRun: null });

    const result = await notifySeoAuditPendingCompletions({
      db: db as never,
      mailer: mailer as never,
      config: enabledConfig,
      deferEmailDelivery: true,
      now,
    });

    expect(result).toEqual({ attempted: 1, sent: 0, skipped: 0 });
    expect(db.seoAuditRun.findMany).toHaveBeenCalledWith({
      where: {
        status: "completed",
        kind: "scheduled",
        userId: { not: null },
        completedAt: { not: null },
        completionNotificationPreparedAt: null,
      },
      orderBy: { completedAt: "asc" },
      take: 25,
      select: { id: true },
    });
    expect(db.notification.createMany.mock.calls[0][0].data[0].id).toBe(
      "seo-audit:completion-summary:run-current",
    );
    expect(db.seoAuditRun.updateMany).toHaveBeenCalledWith({
      where: {
        id: "run-current",
        status: "completed",
        completionNotificationPreparedAt: null,
      },
      data: { completionNotificationPreparedAt: now },
    });
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it("does not notify on an unchanged scheduled result", async () => {
    const mailer = createMailer();
    const unchanged = completedRun({
      summaryScore: 90,
      summaryEvidenceCoverage: 80,
      summaryFindings: previousRun().summaryFindings,
    });
    const db = createDb({ run: unchanged, previousRun: previousRun() });

    const result = await notifySeoAuditRunCompletion("run-current", {
      db: db as never,
      mailer: mailer as never,
      config: enabledConfig,
      now,
    });

    expect(result).toEqual({ attempted: 0, sent: 0, skipped: 0 });
    expect(db.notification.createMany).not.toHaveBeenCalled();
    expect(db.seoAuditRun.updateMany).toHaveBeenCalledWith({
      where: {
        id: "run-current",
        status: "completed",
        completionNotificationPreparedAt: null,
      },
      data: { completionNotificationPreparedAt: now },
    });
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it("does not send email when the deterministic outbox was already sent", async () => {
    const mailer = createMailer();
    const db = createDb({
      run: completedRun(),
      previousRun: previousRun(),
      notificationCreateMany: vi.fn().mockResolvedValue({ count: 0 }),
      outboxCreateMany: vi.fn().mockResolvedValue({ count: 0 }),
      queryRaw: vi.fn().mockResolvedValue([]),
    });

    const result = await notifySeoAuditRunCompletion("run-current", {
      db: db as never,
      mailer: mailer as never,
      config: enabledConfig,
      now,
    });

    expect(result).toEqual({ attempted: 2, sent: 0, skipped: 2 });
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it("retries email after SMTP fails even when the deterministic notification already exists", async () => {
    const smtpError = Object.assign(new Error("temporary SMTP failure"), {
      code: "ETIMEDOUT",
    });
    const mailer = {
      sendMail: vi
        .fn()
        .mockRejectedValueOnce(smtpError)
        .mockResolvedValueOnce({ messageId: "message-2" }),
    };
    const notificationCreateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const outboxCreateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const db = createDb({ notificationCreateMany, outboxCreateMany });
    const event = {
      notificationId: "seo-audit:summary:run-1",
      userId: "user-1",
      recipientEmail: "owner@example.com",
      type: "seo_audit_monitoring_summary",
      title: "Monitoring completed",
      content: "Your scheduled SEO/GEO audit finished.",
      linkUrl: "/user/seo-audit?subscriptionId=subscription-1",
      email: buildSeoAuditMonitoringEmail({
        eventType: "completion_summary" as const,
        targetOrigin: "https://example.com",
        score: 88,
        linkUrl: "/user/seo-audit?subscriptionId=subscription-1",
      }),
    };
    await expect(
      sendSeoAuditMonitoringEvent(event, {
        db: db as never,
        mailer: mailer as never,
        config: enabledConfig,
        now,
      }),
    ).resolves.toEqual({ created: true, emailed: false });
    await expect(
      sendSeoAuditMonitoringEvent(event, {
        db: db as never,
        mailer: mailer as never,
        config: enabledConfig,
        now: new Date(now.getTime() + 60_000),
      }),
    ).resolves.toEqual({ created: false, emailed: true });

    expect(mailer.sendMail).toHaveBeenCalledTimes(2);
  });

  it("sends a final failure notification once", async () => {
    const mailer = createMailer();
    const db = createDb({
      run: completedRun({
        status: "failed",
        completedAt: null,
        failedAt: now,
        failureCode: "SYSTEM_TIMEOUT",
        failureMessage: "The audit worker timed out.",
      }),
    });

    const result = await notifySeoAuditRunFailure("run-current", {
      db: db as never,
      mailer: mailer as never,
      config: enabledConfig,
      now,
    });

    expect(result).toEqual({ attempted: 1, sent: 1, skipped: 0 });
    expect(db.notification.createMany.mock.calls[0][0].data[0].id).toBe(
      "seo-audit:final-failure:run-current",
    );
    expect(mailer.sendMail).toHaveBeenCalledTimes(1);
  });

  it("sends 7-day, 1-day and expired service notifications with stable ids", async () => {
    const mailer = createMailer();
    const db = createDb({
      subscriptions: [
        subscription("subscription-7", new Date("2026-08-02T23:00:00.000Z")),
        subscription("subscription-1", new Date("2026-07-27T23:00:00.000Z")),
        subscription(
          "subscription-expired",
          new Date("2026-07-26T23:00:00.000Z"),
        ),
      ],
    });

    const result = await notifySeoAuditSubscriptionExpirations({
      db: db as never,
      mailer: mailer as never,
      config: enabledConfig,
      now,
    });

    expect(result).toEqual({ attempted: 3, sent: 3, skipped: 0 });
    expect(
      db.notification.createMany.mock.calls.map(([input]) => input.data[0].id),
    ).toEqual([
      "seo-audit:expires-7d:subscription-7:1785711600000",
      "seo-audit:expires-1d:subscription-1:1785193200000",
      "seo-audit:expired:subscription-expired:1785106800000",
    ]);
    expect(mailer.sendMail).toHaveBeenCalledTimes(3);
  });
});

function subscription(id: string, expiresAt: Date) {
  return {
    id,
    userId: "user-1",
    status: expiresAt.getTime() <= now.getTime() ? "expired" : "active",
    expiresAt,
    user: {
      id: "user-1",
      email: "owner@example.com",
      newsletterEmail: null,
      acceptEmailUpdates: false,
    },
    project: { id: "project-1", normalizedOrigin: "https://example.com" },
    schedule: { notificationEmail: "monitoring@example.com" },
  };
}
