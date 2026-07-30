import { describe, expect, it, vi } from "vitest";
import {
  deliverSeoAuditEmailOutbox,
  getSeoAuditEmailRetryDelayMs,
  persistSeoAuditNotificationEmail,
} from "@/lib/seo-audit/email-outbox";

const now = new Date("2026-07-27T00:00:00.000Z");

function createDb() {
  const db = {
    notification: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue({
        user: {
          email: "owner@example.com",
          newsletterEmail: null,
          acceptEmailUpdates: true,
        },
      }),
    },
    seoAuditEmailOutbox: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation(async (callback) => callback(db));
  return db;
}

function persistenceInput(recipientEmail: string | null = "owner@example.com") {
  return {
    notification: {
      id: "seo-audit:completion-summary:run-1",
      userId: "user-1",
      type: "seo_audit_monitoring_summary",
      title: "SEO/GEO monitoring completed",
      content: "The scheduled audit completed.",
      linkUrl: "/user/seo-audit?subscriptionId=subscription-1",
    },
    recipientEmail,
    email: {
      subject: "Monitoring completed",
      text: "Monitoring completed",
      html: "<p>Monitoring completed</p>",
    },
  };
}

function claimedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "seo-audit:completion-summary:run-1",
    notificationId: "seo-audit:completion-summary:run-1",
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

function rawSql(query: unknown) {
  const sql = query as { strings?: readonly string[]; values?: unknown[] };
  return {
    text: sql.strings?.join("?") ?? "",
    values: sql.values ?? [],
  };
}

describe("SEO audit email outbox persistence", () => {
  it("creates a missing outbox row even when the in-app notification already exists", async () => {
    const db = createDb();
    db.notification.createMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      persistSeoAuditNotificationEmail(persistenceInput(), {
        db: db as never,
        now,
      }),
    ).resolves.toEqual({ created: false, queued: true });

    expect(db.notification.createMany).toHaveBeenCalledWith({
      data: [persistenceInput().notification],
      skipDuplicates: true,
    });
    expect(db.seoAuditEmailOutbox.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: "seo-audit:completion-summary:run-1",
          notificationId: "seo-audit:completion-summary:run-1",
          recipient: "owner@example.com",
          status: "pending",
          attemptCount: 0,
          maxAttempts: 5,
          availableAt: now,
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("keeps the in-app notification but does not enqueue without a recipient", async () => {
    const db = createDb();

    await expect(
      persistSeoAuditNotificationEmail(persistenceInput(null), {
        db: db as never,
        now,
      }),
    ).resolves.toEqual({ created: true, queued: false });

    expect(db.notification.createMany).toHaveBeenCalledTimes(1);
    expect(db.seoAuditEmailOutbox.createMany).not.toHaveBeenCalled();
  });
});

describe("SEO audit email outbox delivery", () => {
  it("claims with a lease, sends once, and never reclaims a recorded success", async () => {
    const db = createDb();
    db.$queryRaw
      .mockResolvedValueOnce([claimedRow()])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const send = vi.fn().mockResolvedValue({ messageId: "message-1" });

    await expect(
      deliverSeoAuditEmailOutbox({
        db: db as never,
        send,
        now,
        randomUUID: () => "lease-1",
      }),
    ).resolves.toEqual({ claimed: 1, sent: 1, retried: 0, discarded: 0 });
    await expect(
      deliverSeoAuditEmailOutbox({
        db: db as never,
        send,
        now,
        randomUUID: () => "lease-2",
      }),
    ).resolves.toEqual({ claimed: 0, sent: 0, retried: 0, discarded: 0 });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "seo-audit:completion-summary:run-1",
        to: "owner@example.com",
      }),
    );
    expect(db.seoAuditEmailOutbox.updateMany).toHaveBeenCalledWith({
      where: { id: "seo-audit:completion-summary:run-1", leaseToken: "lease-1" },
      data: expect.objectContaining({
        status: "sent",
        sentAt: now,
        leaseToken: null,
        leaseExpiresAt: null,
        lastErrorCode: null,
      }),
    });

    const claim = rawSql(db.$queryRaw.mock.calls[0][0]);
    expect(claim.text).toMatch(/FOR UPDATE SKIP LOCKED/i);
    expect(claim.text).toMatch(
      /outbox\."attempt_count"\s*<\s*outbox\."max_attempts"/i,
    );
    expect(claim.values).toContain("lease-1");
  });

  it("releases a temporary SMTP failure with bounded exponential backoff and only a safe error code", async () => {
    const db = createDb();
    db.$queryRaw.mockResolvedValueOnce([claimedRow()]).mockResolvedValueOnce([]);
    const send = vi.fn().mockRejectedValue(
      Object.assign(new Error("password=should-not-be-stored"), {
        code: "ETIMEDOUT",
      }),
    );

    await expect(
      deliverSeoAuditEmailOutbox({
        db: db as never,
        send,
        now,
        randomUUID: () => "lease-1",
      }),
    ).resolves.toEqual({ claimed: 1, sent: 0, retried: 1, discarded: 0 });

    expect(db.seoAuditEmailOutbox.updateMany).toHaveBeenCalledWith({
      where: { id: "seo-audit:completion-summary:run-1", leaseToken: "lease-1" },
      data: expect.objectContaining({
        status: "pending",
        availableAt: new Date("2026-07-27T00:01:00.000Z"),
        leaseToken: null,
        leaseExpiresAt: null,
        lastErrorCode: "ETIMEDOUT",
      }),
    });
    expect(JSON.stringify(db.seoAuditEmailOutbox.updateMany.mock.calls)).not.toContain(
      "should-not-be-stored",
    );
  });

  it("discards after the maximum attempt instead of retrying forever", async () => {
    const db = createDb();
    db.$queryRaw
      .mockResolvedValueOnce([claimedRow({ attemptCount: 5 })])
      .mockResolvedValueOnce([]);
    const send = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("SMTP unavailable"), { code: "ECONNECTION" }));

    await expect(
      deliverSeoAuditEmailOutbox({
        db: db as never,
        send,
        now,
        randomUUID: () => "lease-1",
      }),
    ).resolves.toEqual({ claimed: 1, sent: 0, retried: 0, discarded: 1 });

    expect(db.seoAuditEmailOutbox.updateMany).toHaveBeenCalledWith({
      where: { id: "seo-audit:completion-summary:run-1", leaseToken: "lease-1" },
      data: expect.objectContaining({
        status: "discarded",
        lastErrorCode: "ECONNECTION",
      }),
    });
  });

  it("leaves pending messages untouched when no SMTP transport is available", async () => {
    const missingConfigDb = createDb();

    await expect(
      deliverSeoAuditEmailOutbox({
        db: missingConfigDb as never,
        now,
        randomUUID: () => "lease-1",
      }),
    ).resolves.toEqual({ claimed: 0, sent: 0, retried: 0, discarded: 0 });
    expect(missingConfigDb.$queryRaw).not.toHaveBeenCalled();
    expect(missingConfigDb.seoAuditEmailOutbox.updateMany).not.toHaveBeenCalled();
  });

  it("delivers to the persisted service address independently of marketing consent", async () => {
    const db = createDb();
    db.$queryRaw
      .mockResolvedValueOnce([
        claimedRow({ recipient: "monitoring@example.com" }),
      ])
      .mockResolvedValueOnce([]);
    db.notification.findUnique.mockResolvedValueOnce({
      user: {
        email: "owner@example.com",
        newsletterEmail: "marketing@example.com",
        acceptEmailUpdates: false,
      },
    });
    const send = vi.fn().mockResolvedValue({ messageId: "message-1" });

    await expect(
      deliverSeoAuditEmailOutbox({
        db: db as never,
        send,
        now,
        randomUUID: () => "lease-1",
      }),
    ).resolves.toEqual({ claimed: 1, sent: 1, retried: 0, discarded: 0 });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "monitoring@example.com" }),
    );
    expect(db.notification.findUnique).not.toHaveBeenCalled();
    expect(db.seoAuditEmailOutbox.updateMany).toHaveBeenCalledWith({
      where: {
        id: "seo-audit:completion-summary:run-1",
        leaseToken: "lease-1",
      },
      data: expect.objectContaining({
        status: "sent",
        lastErrorCode: null,
      }),
    });
  });

  it("caps exponential retry delay", () => {
    expect(getSeoAuditEmailRetryDelayMs(1)).toBe(60_000);
    expect(getSeoAuditEmailRetryDelayMs(2)).toBe(120_000);
    expect(getSeoAuditEmailRetryDelayMs(3)).toBe(240_000);
    expect(getSeoAuditEmailRetryDelayMs(9)).toBe(15 * 60_000);
  });
});
