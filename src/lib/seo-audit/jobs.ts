import {
  createHash,
  randomBytes as createRandomBytes,
  timingSafeEqual,
} from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  parseSeoAuditReportBundle,
  storePrivateSeoAuditArtifacts,
  type StoredSeoAuditArtifacts,
} from "@/lib/seo-audit/artifacts";

export const SEO_AUDIT_FAILURE_CODES = [
  "INVALID_TARGET",
  "ROBOTS_BLOCKED",
  "SYSTEM_TIMEOUT",
  "SYSTEM_NETWORK",
  "SYSTEM_INTERNAL",
  "ARTIFACT_INVALID",
  "ARTIFACT_STORAGE",
] as const;

export type SeoAuditFailureCode = (typeof SEO_AUDIT_FAILURE_CODES)[number];

export type SeoAuditJobErrorCode =
  | "JOB_NOT_FOUND"
  | "JOB_CANCELLED"
  | "JOB_STATE_CONFLICT"
  | "LEASE_INVALID"
  | "LEASE_EXPIRED";

export class SeoAuditJobError extends Error {
  readonly code: SeoAuditJobErrorCode;

  constructor(code: SeoAuditJobErrorCode) {
    super(code);
    this.name = "SeoAuditJobError";
    this.code = code;
  }
}

type JobDatabase = typeof prisma;

type JobOptions = {
  db?: JobDatabase;
  now?: Date;
  leaseDurationMs?: number;
};

type ClaimOptions = JobOptions & {
  randomBytes?: (size: number) => Buffer;
};

type CompleteOptions = JobOptions & {
  storeArtifacts?: (input: {
    runId: string;
    reportGzipBase64: string;
  }) => Promise<StoredSeoAuditArtifacts>;
};

export type SeoAuditWorkerProgress = {
  phase: "prepare" | "crawl" | "report" | "upload" | "cancel";
  pagesProcessed: number;
  pageLimit: number;
};

type ClaimedRunRow = {
  id: string;
  kind: "free" | "professional" | "deep" | "recheck" | "scheduled";
  targetUrl: string;
  pageLimit: number;
  totalTimeoutSeconds: number;
  leaseExpiresAt: Date;
  attemptCount: number;
  engineVersion: string;
};

const failureMessages: Record<SeoAuditFailureCode, string> = {
  INVALID_TARGET: "The audit target is invalid.",
  ROBOTS_BLOCKED: "The audit target blocked the requested crawl.",
  SYSTEM_TIMEOUT: "The audit worker timed out.",
  SYSTEM_NETWORK: "The audit worker could not complete network requests.",
  SYSTEM_INTERNAL: "The audit worker failed internally.",
  ARTIFACT_INVALID: "The audit report artifact was invalid.",
  ARTIFACT_STORAGE: "The audit report artifact could not be stored.",
};

const refundableFailureCodes = new Set<SeoAuditFailureCode>([
  "SYSTEM_TIMEOUT",
  "SYSTEM_NETWORK",
  "SYSTEM_INTERNAL",
  "ARTIFACT_INVALID",
  "ARTIFACT_STORAGE",
]);

function resolveNow(value: Date | undefined) {
  return value ? new Date(value) : new Date();
}

function resolveLeaseDuration(value: number | undefined) {
  if (!Number.isSafeInteger(value) || Number(value) < 30_000) return 90_000;
  return Math.min(Number(value), 10 * 60_000);
}

function hashLeaseToken(leaseToken: string) {
  return createHash("sha256").update(leaseToken, "utf8").digest("hex");
}

function leaseMatches(storedHash: string | null, leaseToken: string) {
  if (!storedHash || !/^[a-f0-9]{64}$/.test(storedHash)) return false;
  return timingSafeEqual(
    Buffer.from(storedHash, "hex"),
    Buffer.from(hashLeaseToken(leaseToken), "hex"),
  );
}

function assertLiveLease(
  run: { leaseTokenHash: string | null; leaseExpiresAt: Date | null },
  leaseToken: string,
  now: Date,
) {
  if (!leaseMatches(run.leaseTokenHash, leaseToken)) {
    throw new SeoAuditJobError("LEASE_INVALID");
  }
  if (!run.leaseExpiresAt || run.leaseExpiresAt.getTime() <= now.getTime()) {
    throw new SeoAuditJobError("LEASE_EXPIRED");
  }
}

function staleLeaseRecoverySql(now: Date) {
  return Prisma.sql`
    WITH expired AS (
      UPDATE "seo_audit_runs"
      SET
        "status" = CASE
          WHEN "status" = 'cancel_requested' THEN 'cancelled'::"SeoAuditRunStatus"
          WHEN "attempt_count" >= "max_attempts" THEN 'failed'::"SeoAuditRunStatus"
          ELSE 'queued'::"SeoAuditRunStatus"
        END,
        "available_at" = CASE
          WHEN "status" = 'running' AND "attempt_count" < "max_attempts" THEN ${now}
          ELSE "available_at"
        END,
        "failed_at" = CASE
          WHEN "status" = 'running' AND "attempt_count" >= "max_attempts" THEN ${now}
          ELSE "failed_at"
        END,
        "failure_code" = CASE
          WHEN "status" = 'running' AND "attempt_count" >= "max_attempts" THEN 'MAX_ATTEMPTS_EXCEEDED'
          WHEN "attempt_count" < "max_attempts" THEN NULL
          ELSE "failure_code"
        END,
        "failure_message" = CASE
          WHEN "status" = 'running' AND "attempt_count" >= "max_attempts" THEN 'The audit exceeded its maximum attempts.'
          WHEN "attempt_count" < "max_attempts" THEN NULL
          ELSE "failure_message"
        END,
        "lease_token_hash" = NULL,
        "lease_expires_at" = NULL,
        "updated_at" = ${now}
      WHERE "status" IN ('running', 'cancel_requested')
        AND "lease_expires_at" <= ${now}
      RETURNING "credit_id", "status"
    )
    UPDATE "seo_audit_credits" AS credits
    SET
      "remaining_runs" = credits."remaining_runs" + 1,
      "updated_at" = ${now}
    FROM expired
    WHERE expired."status" = 'failed'
      AND expired."credit_id" = credits."id"
      AND credits."remaining_runs" < credits."total_runs"
      AND credits."refunded_at" IS NULL
  `;
}

function claimRunSql(input: {
  now: Date;
  leaseTokenHash: string;
  leaseExpiresAt: Date;
  engineVersion: string;
}) {
  return Prisma.sql`
    WITH candidate AS (
      SELECT runs."id"
      FROM "seo_audit_runs" AS runs
      WHERE runs."status" = 'queued'
        AND runs."available_at" <= ${input.now}
      ORDER BY
        CASE
          WHEN runs."kind" IN ('professional', 'deep', 'recheck') THEN 0
          WHEN runs."kind" = 'scheduled' THEN GREATEST(
            0,
            1 - FLOOR(EXTRACT(EPOCH FROM (${input.now} - runs."available_at")) / 300)::INTEGER
          )
          WHEN runs."kind" = 'free' THEN GREATEST(
            0,
            2 - FLOOR(EXTRACT(EPOCH FROM (${input.now} - runs."available_at")) / 300)::INTEGER
          )
          ELSE 3
        END,
        runs."available_at" ASC,
        runs."created_at" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "seo_audit_runs" AS runs
    SET
      "status" = 'running',
      "lease_token_hash" = ${input.leaseTokenHash},
      "lease_expires_at" = ${input.leaseExpiresAt},
      "attempt_count" = runs."attempt_count" + 1,
      "started_at" = COALESCE(runs."started_at", ${input.now}),
      "engine_version" = ${input.engineVersion},
      "updated_at" = ${input.now}
    FROM candidate
    WHERE runs."id" = candidate."id"
      AND runs."status" = 'queued'
    RETURNING
      runs."id" AS "id",
      runs."kind" AS "kind",
      runs."target_url" AS "targetUrl",
      runs."page_limit" AS "pageLimit",
      runs."total_timeout_seconds" AS "totalTimeoutSeconds",
      runs."lease_expires_at" AS "leaseExpiresAt",
      runs."attempt_count" AS "attemptCount",
      runs."engine_version" AS "engineVersion"
  `;
}

export async function claimSeoAuditJob(
  input: { workerId: string; engineVersion: string },
  options: ClaimOptions = {},
) {
  const db = options.db ?? prisma;
  const now = resolveNow(options.now);
  const leaseToken = (options.randomBytes ?? createRandomBytes)(32).toString(
    "base64url",
  );
  const leaseTokenHash = hashLeaseToken(leaseToken);
  const leaseExpiresAt = new Date(
    now.getTime() + resolveLeaseDuration(options.leaseDurationMs),
  );

  const claimed = await db.$transaction(async (tx) => {
    await tx.$executeRaw(staleLeaseRecoverySql(now));
    const rows = await tx.$queryRaw<ClaimedRunRow[]>(
      claimRunSql({
        now,
        leaseTokenHash,
        leaseExpiresAt,
        engineVersion: input.engineVersion,
      }),
    );
    return rows[0] ?? null;
  });

  if (!claimed) return null;
  return {
    id: claimed.id,
    leaseToken,
    leaseExpiresAt: claimed.leaseExpiresAt,
    targetUrl: claimed.targetUrl,
    pageLimit: claimed.pageLimit,
    requestTimeoutSeconds: 8,
    totalTimeoutSeconds: claimed.totalTimeoutSeconds,
    engineVersion: claimed.engineVersion,
    kind: claimed.kind,
    attemptCount: claimed.attemptCount,
  };
}

export async function heartbeatSeoAuditJob(
  input: {
    runId: string;
    leaseToken: string;
    workerId: string;
    engineVersion: string;
    progress: SeoAuditWorkerProgress;
  },
  options: JobOptions = {},
) {
  const db = options.db ?? prisma;
  const now = resolveNow(options.now);
  const leaseTokenHash = hashLeaseToken(input.leaseToken);

  return db.$transaction(async (tx) => {
    const run = await tx.seoAuditRun.findUnique({
      where: { id: input.runId },
      select: {
        id: true,
        status: true,
        leaseTokenHash: true,
        leaseExpiresAt: true,
      },
    });
    if (!run) throw new SeoAuditJobError("JOB_NOT_FOUND");
    assertLiveLease(run, input.leaseToken, now);

    if (run.status === "cancel_requested") {
      const cancelled = await tx.seoAuditRun.updateMany({
        where: {
          id: input.runId,
          status: "cancel_requested",
          leaseTokenHash,
          leaseExpiresAt: { gt: now },
        },
        data: {
          status: "cancelled",
          leaseTokenHash: null,
          leaseExpiresAt: null,
        },
      });
      if (cancelled.count !== 1) {
        throw new SeoAuditJobError("JOB_STATE_CONFLICT");
      }
      await tx.seoAuditWorkerHeartbeat.upsert({
        where: { workerId: input.workerId },
        update: {
          engineVersion: input.engineVersion,
          status: "idle",
          currentRunId: null,
          lastSeenAt: now,
          metadata: input.progress,
        },
        create: {
          workerId: input.workerId,
          engineVersion: input.engineVersion,
          status: "idle",
          currentRunId: null,
          lastSeenAt: now,
          metadata: input.progress,
        },
      });
      return { cancelRequested: true, leaseExpiresAt: null };
    }
    if (run.status !== "running") {
      throw new SeoAuditJobError("JOB_STATE_CONFLICT");
    }

    const leaseExpiresAt = new Date(
      now.getTime() + resolveLeaseDuration(options.leaseDurationMs),
    );
    const updated = await tx.seoAuditRun.updateMany({
      where: {
        id: input.runId,
        status: "running",
        leaseTokenHash,
        leaseExpiresAt: { gt: now },
      },
      data: { leaseExpiresAt },
    });
    if (updated.count !== 1) {
      throw new SeoAuditJobError("JOB_STATE_CONFLICT");
    }
    await tx.seoAuditWorkerHeartbeat.upsert({
      where: { workerId: input.workerId },
      update: {
        engineVersion: input.engineVersion,
        status: "running",
        currentRunId: input.runId,
        lastSeenAt: now,
        metadata: input.progress,
      },
      create: {
        workerId: input.workerId,
        engineVersion: input.engineVersion,
        status: "running",
        currentRunId: input.runId,
        lastSeenAt: now,
        metadata: input.progress,
      },
    });
    return { cancelRequested: false, leaseExpiresAt };
  });
}

async function defaultArtifactStore(input: {
  runId: string;
  reportGzipBase64: string;
}) {
  const parsed = await parseSeoAuditReportBundle(input.reportGzipBase64);
  return storePrivateSeoAuditArtifacts({ runId: input.runId, parsed });
}

export async function completeSeoAuditJob(
  input: {
    runId: string;
    leaseToken: string;
    reportGzipBase64: string;
  },
  options: CompleteOptions = {},
) {
  const db = options.db ?? prisma;
  const now = resolveNow(options.now);
  const run = await db.seoAuditRun.findUnique({
    where: { id: input.runId },
    select: {
      id: true,
      status: true,
      leaseTokenHash: true,
      leaseExpiresAt: true,
      reportSha256: true,
    },
  });
  if (!run) throw new SeoAuditJobError("JOB_NOT_FOUND");
  if (run.status === "completed") {
    return { status: "completed" as const, alreadyCompleted: true };
  }
  if (run.status === "cancel_requested" || run.status === "cancelled") {
    throw new SeoAuditJobError("JOB_CANCELLED");
  }
  if (run.status !== "running") {
    throw new SeoAuditJobError("JOB_STATE_CONFLICT");
  }
  assertLiveLease(run, input.leaseToken, now);

  const stored = await (options.storeArtifacts ?? defaultArtifactStore)({
    runId: input.runId,
    reportGzipBase64: input.reportGzipBase64,
  });
  const leaseTokenHash = hashLeaseToken(input.leaseToken);
  const updated = await db.$transaction((tx) =>
    tx.seoAuditRun.updateMany({
      where: {
        id: input.runId,
        status: "running",
        leaseTokenHash,
        leaseExpiresAt: { gt: now },
        cancelRequestedAt: null,
      },
      data: {
        status: "completed",
        completedAt: now,
        failedAt: null,
        failureCode: null,
        failureMessage: null,
        leaseTokenHash: null,
        leaseExpiresAt: null,
        engineVersion: stored.engineVersion,
        summaryScore: stored.summary.score,
        summaryEvidenceCoverage: stored.summary.evidenceCoverage,
        summaryPageCount: stored.summary.pageCount,
        summaryCriticalCount: stored.summary.criticalCount,
        summaryHighCount: stored.summary.highCount,
        summaryMediumCount: stored.summary.mediumCount,
        summaryFindings: stored.summary.findings,
        reportJsonKey: stored.reportJsonKey,
        reportMarkdownKey: stored.reportMarkdownKey,
        reportSha256: stored.reportSha256,
      },
    }),
  );
  if (updated.count !== 1) {
    throw new SeoAuditJobError("JOB_STATE_CONFLICT");
  }
  return { status: "completed" as const, alreadyCompleted: false };
}

export async function failSeoAuditJob(
  input: {
    runId: string;
    leaseToken: string;
    failureCode: SeoAuditFailureCode;
  },
  options: JobOptions = {},
) {
  const db = options.db ?? prisma;
  const now = resolveNow(options.now);
  const leaseTokenHash = hashLeaseToken(input.leaseToken);

  return db.$transaction(async (tx) => {
    const run = await tx.seoAuditRun.findUnique({
      where: { id: input.runId },
      select: {
        id: true,
        status: true,
        leaseTokenHash: true,
        leaseExpiresAt: true,
        creditId: true,
      },
    });
    if (!run) throw new SeoAuditJobError("JOB_NOT_FOUND");
    if (run.status === "failed") {
      return { status: "failed" as const, alreadyFailed: true };
    }
    if (run.status === "cancel_requested" || run.status === "cancelled") {
      return { status: "cancelled" as const, alreadyFailed: false };
    }
    if (run.status !== "running") {
      throw new SeoAuditJobError("JOB_STATE_CONFLICT");
    }
    assertLiveLease(run, input.leaseToken, now);

    const failed = await tx.seoAuditRun.updateMany({
      where: {
        id: input.runId,
        status: "running",
        leaseTokenHash,
        leaseExpiresAt: { gt: now },
      },
      data: {
        status: "failed",
        failedAt: now,
        failureCode: input.failureCode,
        failureMessage: failureMessages[input.failureCode],
        leaseTokenHash: null,
        leaseExpiresAt: null,
      },
    });
    if (failed.count !== 1) {
      throw new SeoAuditJobError("JOB_STATE_CONFLICT");
    }

    if (run.creditId && refundableFailureCodes.has(input.failureCode)) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "seo_audit_credits"
        SET
          "remaining_runs" = "remaining_runs" + 1,
          "updated_at" = ${now}
        WHERE "id" = ${run.creditId}
          AND "remaining_runs" < "total_runs"
          AND "refunded_at" IS NULL
      `);
    }
    return { status: "failed" as const, alreadyFailed: false };
  });
}

export async function requestSeoAuditJobCancellation(
  runId: string,
  options: Pick<JobOptions, "db" | "now"> = {},
) {
  const db = options.db ?? prisma;
  const now = resolveNow(options.now);

  return db.$transaction(async (tx) => {
    const run = await tx.seoAuditRun.findUnique({
      where: { id: runId },
      select: { id: true, status: true },
    });
    if (!run) throw new SeoAuditJobError("JOB_NOT_FOUND");

    if (run.status === "queued") {
      await tx.seoAuditRun.update({
        where: { id: runId },
        data: {
          status: "cancelled",
          cancelRequestedAt: now,
          leaseTokenHash: null,
          leaseExpiresAt: null,
        },
      });
      return { status: "cancelled" as const };
    }
    if (run.status === "running") {
      await tx.seoAuditRun.update({
        where: { id: runId },
        data: { status: "cancel_requested", cancelRequestedAt: now },
      });
      return { status: "cancel_requested" as const };
    }
    return { status: run.status };
  });
}
