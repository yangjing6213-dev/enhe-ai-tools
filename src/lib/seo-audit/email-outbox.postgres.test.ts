import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { deliverSeoAuditEmailOutbox } from "@/lib/seo-audit/email-outbox";

const databaseUrl = process.env.SEO_AUDIT_TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres("PostgreSQL SEO audit email outbox", () => {
  let db: PrismaClient;
  let concurrentDb: PrismaClient;

  beforeAll(() => {
    db = new PrismaClient({ datasourceUrl: databaseUrl });
    concurrentDb = new PrismaClient({ datasourceUrl: databaseUrl });
  });

  afterAll(async () => {
    await Promise.all([db?.$disconnect(), concurrentDb?.$disconnect()]);
  });

  it("allows only one scheduler to claim and send an outbox row", async () => {
    const fixture = await createFixture(db);
    let releaseSend!: () => void;
    let signalClaimed!: () => void;
    const sendBlocked = new Promise<void>((resolve) => {
      releaseSend = resolve;
    });
    const claimed = new Promise<void>((resolve) => {
      signalClaimed = resolve;
    });
    const send = vi.fn(async () => {
      signalClaimed();
      await sendBlocked;
    });

    try {
      const first = deliverSeoAuditEmailOutbox({
        db,
        send,
        now: fixture.now,
        limit: 1,
        randomUUID: () => "postgres-lease-1",
      });
      await claimed;
      await expect(
        deliverSeoAuditEmailOutbox({
          db: concurrentDb,
          send,
          now: fixture.now,
          limit: 1,
          randomUUID: () => "postgres-lease-2",
        }),
      ).resolves.toEqual({ claimed: 0, sent: 0, retried: 0, discarded: 0 });

      releaseSend();
      await expect(first).resolves.toEqual({
        claimed: 1,
        sent: 1,
        retried: 0,
        discarded: 0,
      });
      expect(send).toHaveBeenCalledTimes(1);
      await expect(
        db.seoAuditEmailOutbox.findUnique({ where: { id: fixture.notificationId } }),
      ).resolves.toMatchObject({ status: "sent", attemptCount: 1 });
    } finally {
      releaseSend();
      await cleanupFixture(db, fixture.userId);
    }
  }, 30_000);

  it("waits for exponential backoff before retrying a temporary failure", async () => {
    const fixture = await createFixture(db);
    const send = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("temporary failure"), { code: "ETIMEDOUT" }),
      )
      .mockResolvedValueOnce({ messageId: "message-2" });

    try {
      await expect(
        deliverSeoAuditEmailOutbox({
          db,
          send,
          now: fixture.now,
          limit: 1,
          randomUUID: () => "postgres-retry-lease-1",
        }),
      ).resolves.toEqual({ claimed: 1, sent: 0, retried: 1, discarded: 0 });
      await expect(
        db.seoAuditEmailOutbox.findUnique({ where: { id: fixture.notificationId } }),
      ).resolves.toMatchObject({
        status: "pending",
        attemptCount: 1,
        availableAt: new Date(fixture.now.getTime() + 60_000),
        lastErrorCode: "ETIMEDOUT",
      });

      await expect(
        deliverSeoAuditEmailOutbox({
          db: concurrentDb,
          send,
          now: new Date(fixture.now.getTime() + 59_999),
          limit: 1,
          randomUUID: () => "postgres-retry-lease-early",
        }),
      ).resolves.toEqual({ claimed: 0, sent: 0, retried: 0, discarded: 0 });
      await expect(
        deliverSeoAuditEmailOutbox({
          db: concurrentDb,
          send,
          now: new Date(fixture.now.getTime() + 60_000),
          limit: 1,
          randomUUID: () => "postgres-retry-lease-2",
        }),
      ).resolves.toEqual({ claimed: 1, sent: 1, retried: 0, discarded: 0 });
      expect(send).toHaveBeenCalledTimes(2);
    } finally {
      await cleanupFixture(db, fixture.userId);
    }
  }, 30_000);
});

async function createFixture(db: PrismaClient) {
  const suffix = randomUUID();
  const now = new Date("2026-07-27T00:00:00.000Z");
  const user = await db.user.create({
    data: {
      email: `outbox-${suffix}@example.test`,
      passwordHash: "integration-test",
      acceptEmailUpdates: true,
    },
  });
  const notificationId = `seo-audit:outbox-test:${suffix}`;
  await db.notification.create({
    data: {
      id: notificationId,
      userId: user.id,
      type: "seo_audit_monitoring_summary",
      title: "Monitoring completed",
      content: "The scheduled audit completed.",
      linkUrl: "/user/seo-audit",
      emailOutbox: {
        create: {
          id: notificationId,
          recipient: user.email as string,
          subject: "Monitoring completed",
          textBody: "Monitoring completed",
          htmlBody: "<p>Monitoring completed</p>",
          availableAt: now,
        },
      },
    },
  });
  return { userId: user.id, notificationId, now };
}

async function cleanupFixture(db: PrismaClient, userId: string) {
  await db.notification.deleteMany({ where: { userId } });
  await db.user.deleteMany({ where: { id: userId } });
}
