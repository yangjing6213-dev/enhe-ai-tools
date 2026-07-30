import { randomUUID as createRandomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const defaultMaxAttempts = 5;
const defaultLeaseDurationMs = 60_000;
const retryBaseDelayMs = 60_000;
const retryMaxDelayMs = 15 * 60_000;

type EmailOutboxDb = typeof prisma;

type PersistedNotification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  linkUrl: string;
};

type OutboxEmail = {
  subject: string;
  text: string;
  html: string;
};

type ClaimedOutboxRow = {
  id: string;
  notificationId: string;
  recipient: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  leaseToken: string;
  attemptCount: number;
  maxAttempts: number;
};

export type SeoAuditOutboxMessage = {
  id: string;
  notificationId: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

type DeliverOptions = {
  db?: EmailOutboxDb;
  now?: Date;
  limit?: number;
  notificationId?: string;
  leaseDurationMs?: number;
  randomUUID?: () => string;
  send?: (message: SeoAuditOutboxMessage) => Promise<unknown>;
};

export async function persistSeoAuditNotificationEmail(
  input: {
    notification: PersistedNotification;
    recipientEmail: string | null;
    email: OutboxEmail;
  },
  options: { db?: EmailOutboxDb; now?: Date } = {},
) {
  const db = options.db ?? prisma;
  const now = options.now ? new Date(options.now) : new Date();
  const recipient = input.recipientEmail?.trim() || null;

  return db.$transaction(async (tx) => {
    const notification = await tx.notification.createMany({
      data: [input.notification],
      skipDuplicates: true,
    });
    if (!recipient) {
      return { created: notification.count === 1, queued: false };
    }

    const outbox = await tx.seoAuditEmailOutbox.createMany({
      data: [
        {
          id: input.notification.id,
          notificationId: input.notification.id,
          recipient,
          subject: input.email.subject,
          textBody: input.email.text,
          htmlBody: input.email.html,
          status: "pending",
          availableAt: now,
          attemptCount: 0,
          maxAttempts: defaultMaxAttempts,
        },
      ],
      skipDuplicates: true,
    });
    return {
      created: notification.count === 1,
      queued: outbox.count === 1,
    };
  });
}

export async function deliverSeoAuditEmailOutbox(options: DeliverOptions = {}) {
  const db = options.db ?? prisma;
  const now = options.now ? new Date(options.now) : new Date();
  const limit = boundedLimit(options.limit, 25);
  const leaseDurationMs = boundedLeaseDuration(options.leaseDurationMs);
  const randomUUID = options.randomUUID ?? createRandomUUID;
  const summary = { claimed: 0, sent: 0, retried: 0, discarded: 0 };
  if (!options.send) return summary;

  for (let index = 0; index < limit; index += 1) {
    const leaseToken = randomUUID();
    const rows = await db.$queryRaw<ClaimedOutboxRow[]>(
      claimOutboxSql({
        now,
        leaseToken,
        leaseExpiresAt: new Date(now.getTime() + leaseDurationMs),
        notificationId: options.notificationId,
      }),
    );
    const claimed = rows[0];
    if (!claimed) break;
    summary.claimed += 1;

    try {
      await options.send({
        id: claimed.id,
        notificationId: claimed.notificationId,
        to: claimed.recipient,
        subject: claimed.subject,
        text: claimed.textBody,
        html: claimed.htmlBody,
      });
      await db.seoAuditEmailOutbox.updateMany({
        where: { id: claimed.id, leaseToken: claimed.leaseToken },
        data: {
          status: "sent",
          sentAt: now,
          leaseToken: null,
          leaseExpiresAt: null,
          lastErrorCode: null,
        },
      });
      summary.sent += 1;
    } catch (error) {
      const lastErrorCode = safeEmailErrorCode(error);
      if (claimed.attemptCount >= claimed.maxAttempts) {
        await discardClaim(db, claimed, lastErrorCode);
        summary.discarded += 1;
      } else {
        await db.seoAuditEmailOutbox.updateMany({
          where: { id: claimed.id, leaseToken: claimed.leaseToken },
          data: {
            status: "pending",
            availableAt: new Date(
              now.getTime() + getSeoAuditEmailRetryDelayMs(claimed.attemptCount),
            ),
            leaseToken: null,
            leaseExpiresAt: null,
            lastErrorCode,
          },
        });
        summary.retried += 1;
      }
    }
  }

  return summary;
}

export function getSeoAuditEmailRetryDelayMs(attemptCount: number) {
  const exponent = Math.max(0, Math.floor(attemptCount) - 1);
  return Math.min(retryBaseDelayMs * 2 ** exponent, retryMaxDelayMs);
}

function claimOutboxSql(input: {
  now: Date;
  leaseToken: string;
  leaseExpiresAt: Date;
  notificationId?: string;
}) {
  const notificationFilter = input.notificationId
    ? Prisma.sql`AND outbox."notification_id" = ${input.notificationId}`
    : Prisma.empty;
  return Prisma.sql`
    WITH candidate AS (
      SELECT outbox."id"
      FROM "seo_audit_email_outbox" AS outbox
      WHERE (
        outbox."status" = 'pending'
        OR (
          outbox."status" = 'sending'
          AND (
            outbox."lease_expires_at" IS NULL
            OR outbox."lease_expires_at" <= ${input.now}
          )
        )
      )
        AND outbox."available_at" <= ${input.now}
        AND outbox."attempt_count" < outbox."max_attempts"
        ${notificationFilter}
      ORDER BY outbox."available_at" ASC, outbox."created_at" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "seo_audit_email_outbox" AS outbox
    SET
      "status" = 'sending',
      "lease_token" = ${input.leaseToken},
      "lease_expires_at" = ${input.leaseExpiresAt},
      "attempt_count" = outbox."attempt_count" + 1,
      "updated_at" = ${input.now}
    FROM candidate
    WHERE outbox."id" = candidate."id"
    RETURNING
      outbox."id" AS "id",
      outbox."notification_id" AS "notificationId",
      outbox."recipient" AS "recipient",
      outbox."subject" AS "subject",
      outbox."text_body" AS "textBody",
      outbox."html_body" AS "htmlBody",
      outbox."lease_token" AS "leaseToken",
      outbox."attempt_count" AS "attemptCount",
      outbox."max_attempts" AS "maxAttempts"
  `;
}

async function discardClaim(
  db: EmailOutboxDb,
  claimed: ClaimedOutboxRow,
  lastErrorCode: string,
) {
  await db.seoAuditEmailOutbox.updateMany({
    where: { id: claimed.id, leaseToken: claimed.leaseToken },
    data: {
      status: "discarded",
      leaseToken: null,
      leaseExpiresAt: null,
      lastErrorCode,
    },
  });
}

function safeEmailErrorCode(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : null;
  if (typeof code === "string" && safeErrorCodes.has(code)) return code;

  const responseCode =
    typeof error === "object" && error !== null && "responseCode" in error
      ? error.responseCode
      : null;
  if (
    typeof responseCode === "number" &&
    Number.isInteger(responseCode) &&
    responseCode >= 400 &&
    responseCode <= 599
  ) {
    return "SMTP_" + responseCode;
  }
  return "SMTP_SEND_FAILED";
}

const safeErrorCodes = new Set([
  "EAUTH",
  "ECONNECTION",
  "ECONNRESET",
  "EENVELOPE",
  "EMESSAGE",
  "ENOTFOUND",
  "ESOCKET",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

function boundedLimit(value: number | undefined, fallback: number) {
  return Number.isSafeInteger(value)
    ? Math.min(Math.max(Number(value), 1), 100)
    : fallback;
}

function boundedLeaseDuration(value: number | undefined) {
  return Number.isSafeInteger(value) && Number(value) >= 30_000
    ? Math.min(Number(value), 5 * 60_000)
    : defaultLeaseDurationMs;
}
