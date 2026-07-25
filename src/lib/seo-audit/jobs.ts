import {
  createHash,
  randomBytes as createRandomBytes,
  timingSafeEqual,
} from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  assertSeoAuditReportMatchesRun,
  assertSeoAuditSummaryMatches,
  buildPrivateArtifactKeys,
  parseSeoAuditReportBundle,
  removePrivateSeoAuditArtifacts,
  SEO_AUDIT_ENGINE_VERSION,
  storePrivateSeoAuditArtifacts,
  type ParsedSeoAuditReport,
  type SeoAuditCompletionSummary,
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
  | "LEASE_EXPIRED"
  | "ENGINE_VERSION_UNSUPPORTED";

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
  parseReport?: (reportGzipBase64: string) => Promise<ParsedSeoAuditReport>;
  storeArtifacts?: (input: {
    runId: string;
    parsed: ParsedSeoAuditReport;
  }) => Promise<StoredSeoAuditArtifacts>;
  removeArtifacts?: (input: StoredSeoAuditArtifacts) => Promise<void>;
  randomBytes?: (size: number) => Buffer;
  completionPollIntervalMs?: number;
  completionWaitTimeoutMs?: number;
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
        "report_json_key" = NULL,
        "report_markdown_key" = NULL,
        "report_sha256" = NULL,
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
  if (input.engineVersion !== SEO_AUDIT_ENGINE_VERSION) {
    throw new SeoAuditJobError("ENGINE_VERSION_UNSUPPORTED");
  }
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
        engineVersion: true,
      },
    });
    if (!run) throw new SeoAuditJobError("JOB_NOT_FOUND");
    if (
      input.engineVersion !== SEO_AUDIT_ENGINE_VERSION ||
      run.engineVersion !== input.engineVersion
    ) {
      throw new SeoAuditJobError("ENGINE_VERSION_UNSUPPORTED");
    }
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
          reportJsonKey: null,
          reportMarkdownKey: null,
          reportSha256: null,
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

const completionRunSelect = {
  id: true,
  status: true,
  targetUrl: true,
  pageLimit: true,
  engineVersion: true,
  leaseTokenHash: true,
  leaseExpiresAt: true,
  reportJsonKey: true,
  reportMarkdownKey: true,
  reportSha256: true,
  summaryScore: true,
  summaryEvidenceCoverage: true,
  summaryPageCount: true,
  summaryCriticalCount: true,
  summaryHighCount: true,
  summaryMediumCount: true,
} satisfies Prisma.SeoAuditRunSelect;

type CompletionRun = Prisma.SeoAuditRunGetPayload<{
  select: typeof completionRunSelect;
}>;

const completionReservationPrefix = "seo-audit-pending-upload:";
const completionReservationTimeoutMs = 65_000;

function buildCompletionReservation(
  now: Date,
  randomBytes: (size: number) => Buffer,
) {
  const nonce = randomBytes(24).toString("base64url");
  return `${completionReservationPrefix}${now.getTime()}:${nonce}`;
}

function readCompletionReservationStartedAt(value: string | null) {
  if (!value?.startsWith(completionReservationPrefix)) return null;
  const [timestamp, nonce] = value
    .slice(completionReservationPrefix.length)
    .split(":", 2);
  const startedAt = Number(timestamp);
  return Number.isSafeInteger(startedAt) && nonce ? startedAt : null;
}

async function lockCompletionRun(
  tx: Prisma.TransactionClient,
  runId: string,
) {
  const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "seo_audit_runs"
    WHERE "id" = ${runId}
    FOR UPDATE
  `);
  if (!locked[0]) throw new SeoAuditJobError("JOB_NOT_FOUND");
  const run = await tx.seoAuditRun.findUnique({
    where: { id: runId },
    select: completionRunSelect,
  });
  if (!run) throw new SeoAuditJobError("JOB_NOT_FOUND");
  return run;
}

function storedCompletionSummary(run: CompletionRun) {
  if (
    run.summaryScore === null ||
    run.summaryEvidenceCoverage === null ||
    run.summaryPageCount === null ||
    run.summaryCriticalCount === null ||
    run.summaryHighCount === null ||
    run.summaryMediumCount === null
  ) {
    return null;
  }
  return {
    score: run.summaryScore,
    evidenceCoverage: run.summaryEvidenceCoverage,
    pageCount: run.summaryPageCount,
    criticalCount: run.summaryCriticalCount,
    highCount: run.summaryHighCount,
    mediumCount: run.summaryMediumCount,
  };
}

function assertCompletedPayloadMatches(
  run: CompletionRun,
  parsed: ParsedSeoAuditReport,
  summary: SeoAuditCompletionSummary,
) {
  assertSeoAuditReportMatchesRun(parsed, run);
  assertSeoAuditSummaryMatches(summary, parsed.summary);
  const storedSummary = storedCompletionSummary(run);
  const expectedKeys = buildPrivateArtifactKeys(run.id, parsed.reportSha256);
  if (
    run.reportSha256 !== parsed.reportSha256 ||
    run.reportJsonKey !== expectedKeys.jsonKey ||
    run.reportMarkdownKey !== expectedKeys.markdownKey ||
    !storedSummary ||
    JSON.stringify(storedSummary) !== JSON.stringify(summary)
  ) {
    throw new SeoAuditJobError("JOB_STATE_CONFLICT");
  }
}

async function settleCancelledRun(
  tx: Prisma.TransactionClient,
  runId: string,
  now: Date,
) {
  await tx.seoAuditRun.update({
    where: { id: runId },
    data: {
      status: "cancelled",
      cancelRequestedAt: now,
      leaseTokenHash: null,
      leaseExpiresAt: null,
      reportJsonKey: null,
      reportMarkdownKey: null,
      reportSha256: null,
    },
  });
}

async function settleCompletionCancellation(
  db: JobDatabase,
  runId: string,
  now: Date,
) {
  return db.$transaction(async (tx) => {
    const run = await lockCompletionRun(tx, runId);
    if (run.status === "cancel_requested") {
      await settleCancelledRun(tx, runId, now);
      return { status: "cancelled" as const, alreadyCompleted: false };
    }
    if (run.status === "cancelled") {
      if (run.leaseTokenHash || run.leaseExpiresAt || run.reportSha256) {
        await settleCancelledRun(tx, runId, now);
      }
      return { status: "cancelled" as const, alreadyCompleted: false };
    }
    return null;
  });
}

async function prepareSeoAuditCompletion(input: {
  db: JobDatabase;
  runId: string;
  leaseToken: string;
  parsed: ParsedSeoAuditReport;
  summary: SeoAuditCompletionSummary;
  reservation: string;
  now: Date;
}) {
  return input.db.$transaction(async (tx) => {
    const run = await lockCompletionRun(tx, input.runId);
    if (run.status === "completed") {
      assertCompletedPayloadMatches(run, input.parsed, input.summary);
      return { state: "completed" as const };
    }
    if (run.status === "cancel_requested") {
      await settleCancelledRun(tx, input.runId, input.now);
      return { state: "cancelled" as const };
    }
    if (run.status === "cancelled") {
      if (run.leaseTokenHash || run.leaseExpiresAt || run.reportSha256) {
        await settleCancelledRun(tx, input.runId, input.now);
      }
      return { state: "cancelled" as const };
    }
    if (run.status !== "running") {
      throw new SeoAuditJobError("JOB_STATE_CONFLICT");
    }
    assertLiveLease(run, input.leaseToken, input.now);
    assertSeoAuditReportMatchesRun(input.parsed, run);

    if (!run.reportSha256 && !run.reportJsonKey && !run.reportMarkdownKey) {
      await tx.seoAuditRun.update({
        where: { id: input.runId },
        data: {
          reportSha256: input.parsed.reportSha256,
          reportJsonKey: input.reservation,
          reportMarkdownKey: null,
        },
      });
      return { state: "upload" as const };
    }

    const activeReservation = run.reportJsonKey;
    const reservationStartedAt = readCompletionReservationStartedAt(
      activeReservation,
    );
    if (
      run.reportSha256 === input.parsed.reportSha256 &&
      activeReservation !== null &&
      reservationStartedAt !== null &&
      !run.reportMarkdownKey
    ) {
      if (
        input.now.getTime() - reservationStartedAt >=
        completionReservationTimeoutMs
      ) {
        await tx.seoAuditRun.update({
          where: { id: input.runId },
          data: { reportJsonKey: input.reservation },
        });
        return { state: "upload" as const };
      }
      return { state: "wait" as const, reservation: activeReservation };
    }

    throw new SeoAuditJobError("JOB_STATE_CONFLICT");
  });
}

async function waitForCompletionReservation(
  db: JobDatabase,
  runId: string,
  reservation: string,
  options: CompleteOptions,
) {
  const interval = Math.max(5, options.completionPollIntervalMs ?? 50);
  const timeout = Math.max(
    interval,
    options.completionWaitTimeoutMs ?? completionReservationTimeoutMs,
  );
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const run = await db.seoAuditRun.findUnique({
      where: { id: runId },
      select: { status: true, reportJsonKey: true },
    });
    if (!run) throw new SeoAuditJobError("JOB_NOT_FOUND");
    if (run.status !== "running" || run.reportJsonKey !== reservation) return;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

async function rollbackSeoAuditCompletion(input: {
  db: JobDatabase;
  runId: string;
  leaseTokenHash: string;
  reportSha256: string;
  reservation: string;
  now: Date;
}) {
  return input.db.$transaction(async (tx) => {
    const run = await lockCompletionRun(tx, input.runId);
    if (run.status === "cancel_requested") {
      await settleCancelledRun(tx, input.runId, input.now);
      return "cancelled" as const;
    }
    if (run.status === "running") {
      await tx.seoAuditRun.updateMany({
        where: {
          id: input.runId,
          status: "running",
          leaseTokenHash: input.leaseTokenHash,
          reportSha256: input.reportSha256,
          reportJsonKey: input.reservation,
        },
        data: {
          reportJsonKey: null,
          reportMarkdownKey: null,
          reportSha256: null,
        },
      });
    }
    return run.status;
  });
}

async function finalizeSeoAuditCompletion(input: {
  db: JobDatabase;
  runId: string;
  leaseToken: string;
  parsed: ParsedSeoAuditReport;
  summary: SeoAuditCompletionSummary;
  reservation: string;
  stored: StoredSeoAuditArtifacts;
  now: Date;
}) {
  return input.db.$transaction(async (tx) => {
    const run = await lockCompletionRun(tx, input.runId);
    if (run.status === "completed") {
      assertCompletedPayloadMatches(run, input.parsed, input.summary);
      return { status: "completed" as const, alreadyCompleted: true };
    }
    if (run.status === "cancel_requested") {
      await settleCancelledRun(tx, input.runId, input.now);
      return { status: "cancelled" as const, alreadyCompleted: false };
    }
    if (run.status === "cancelled") {
      if (run.leaseTokenHash || run.leaseExpiresAt || run.reportSha256) {
        await settleCancelledRun(tx, input.runId, input.now);
      }
      return { status: "cancelled" as const, alreadyCompleted: false };
    }
    if (run.status !== "running") {
      throw new SeoAuditJobError("JOB_STATE_CONFLICT");
    }
    assertLiveLease(run, input.leaseToken, input.now);
    assertSeoAuditReportMatchesRun(input.parsed, run);
    if (
      run.reportSha256 !== input.parsed.reportSha256 ||
      run.reportJsonKey !== input.reservation ||
      run.reportMarkdownKey !== null
    ) {
      throw new SeoAuditJobError("JOB_STATE_CONFLICT");
    }

    await tx.seoAuditRun.update({
      where: { id: input.runId },
      data: {
        status: "completed",
        completedAt: input.now,
        failedAt: null,
        failureCode: null,
        failureMessage: null,
        cancelRequestedAt: null,
        leaseTokenHash: null,
        leaseExpiresAt: null,
        engineVersion: input.parsed.engineVersion,
        summaryScore: input.summary.score,
        summaryEvidenceCoverage: input.summary.evidenceCoverage,
        summaryPageCount: input.summary.pageCount,
        summaryCriticalCount: input.summary.criticalCount,
        summaryHighCount: input.summary.highCount,
        summaryMediumCount: input.summary.mediumCount,
        summaryFindings: input.parsed.publicFindings,
        reportJsonKey: input.stored.reportJsonKey,
        reportMarkdownKey: input.stored.reportMarkdownKey,
        reportSha256: input.parsed.reportSha256,
      },
    });
    return { status: "completed" as const, alreadyCompleted: false };
  });
}

async function cleanupUploadedArtifacts(
  stored: StoredSeoAuditArtifacts,
  removeArtifacts: (input: StoredSeoAuditArtifacts) => Promise<void>,
) {
  try {
    await removeArtifacts(stored);
  } catch {
    console.error("SEO audit artifact cleanup failed.");
  }
}

export async function completeSeoAuditJob(
  input: {
    runId: string;
    leaseToken: string;
    reportGzipBase64: string;
    summary: SeoAuditCompletionSummary;
  },
  options: CompleteOptions = {},
) {
  const db = options.db ?? prisma;
  const now = resolveNow(options.now);
  const initialRun = await db.seoAuditRun.findUnique({
    where: { id: input.runId },
    select: completionRunSelect,
  });
  if (!initialRun) throw new SeoAuditJobError("JOB_NOT_FOUND");
  if (
    initialRun.status === "cancel_requested" ||
    initialRun.status === "cancelled"
  ) {
    const cancelled = await settleCompletionCancellation(db, input.runId, now);
    if (cancelled) throw new SeoAuditJobError("JOB_CANCELLED");
  }
  if (initialRun.status === "running") {
    assertLiveLease(initialRun, input.leaseToken, now);
  } else if (initialRun.status !== "completed") {
    throw new SeoAuditJobError("JOB_STATE_CONFLICT");
  }

  const parsed = await (options.parseReport ?? parseSeoAuditReportBundle)(
    input.reportGzipBase64,
  );
  assertSeoAuditSummaryMatches(input.summary, parsed.summary);
  assertSeoAuditReportMatchesRun(parsed, initialRun);
  if (initialRun.status === "completed") {
    assertCompletedPayloadMatches(initialRun, parsed, input.summary);
    if (initialRun.leaseTokenHash || initialRun.leaseExpiresAt) {
      await db.$transaction(async (tx) => {
        const run = await lockCompletionRun(tx, input.runId);
        if (run.status !== "completed") {
          throw new SeoAuditJobError("JOB_STATE_CONFLICT");
        }
        assertCompletedPayloadMatches(run, parsed, input.summary);
        if (run.leaseTokenHash || run.leaseExpiresAt) {
          await tx.seoAuditRun.update({
            where: { id: input.runId },
            data: { leaseTokenHash: null, leaseExpiresAt: null },
          });
        }
      });
    }
    return { status: "completed" as const, alreadyCompleted: true };
  }

  const leaseTokenHash = hashLeaseToken(input.leaseToken);
  const storeArtifacts =
    options.storeArtifacts ?? storePrivateSeoAuditArtifacts;
  const removeArtifacts =
    options.removeArtifacts ?? removePrivateSeoAuditArtifacts;
  const randomBytes = options.randomBytes ?? createRandomBytes;
  let reservation = buildCompletionReservation(now, randomBytes);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const attemptNow = resolveNow(options.now);
    const prepared = await prepareSeoAuditCompletion({
      db,
      runId: input.runId,
      leaseToken: input.leaseToken,
      parsed,
      summary: input.summary,
      reservation,
      now: attemptNow,
    });
    if (prepared.state === "completed") {
      return { status: "completed" as const, alreadyCompleted: true };
    }
    if (prepared.state === "cancelled") {
      throw new SeoAuditJobError("JOB_CANCELLED");
    }
    if (prepared.state === "wait") {
      await waitForCompletionReservation(
        db,
        input.runId,
        prepared.reservation,
        options,
      );
      reservation = buildCompletionReservation(
        resolveNow(options.now),
        randomBytes,
      );
      continue;
    }

    let stored: StoredSeoAuditArtifacts;
    try {
      stored = await storeArtifacts({ runId: input.runId, parsed });
    } catch (error) {
      const rollbackStatus = await rollbackSeoAuditCompletion({
        db,
        runId: input.runId,
        leaseTokenHash,
        reportSha256: parsed.reportSha256,
        reservation,
        now: resolveNow(options.now),
      });
      if (rollbackStatus === "cancelled") {
        throw new SeoAuditJobError("JOB_CANCELLED");
      }
      throw error;
    }

    const expectedKeys = buildPrivateArtifactKeys(
      input.runId,
      parsed.reportSha256,
    );
    if (
      stored.reportJsonKey !== expectedKeys.jsonKey ||
      stored.reportMarkdownKey !== expectedKeys.markdownKey
    ) {
      await rollbackSeoAuditCompletion({
        db,
        runId: input.runId,
        leaseTokenHash,
        reportSha256: parsed.reportSha256,
        reservation,
        now: resolveNow(options.now),
      });
      await cleanupUploadedArtifacts(stored, removeArtifacts);
      throw new SeoAuditJobError("JOB_STATE_CONFLICT");
    }

    let result: Awaited<ReturnType<typeof finalizeSeoAuditCompletion>>;
    try {
      result = await finalizeSeoAuditCompletion({
        db,
        runId: input.runId,
        leaseToken: input.leaseToken,
        parsed,
        summary: input.summary,
        reservation,
        stored,
        now: resolveNow(options.now),
      });
    } catch (error) {
      await cleanupUploadedArtifacts(stored, removeArtifacts);
      throw error;
    }
    if (result.status !== "completed") {
      await cleanupUploadedArtifacts(stored, removeArtifacts);
      throw new SeoAuditJobError("JOB_CANCELLED");
    }
    return result;
  }

  throw new SeoAuditJobError("JOB_STATE_CONFLICT");
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
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "seo_audit_runs"
      WHERE "id" = ${input.runId}
      FOR UPDATE
    `);
    if (!locked[0]) throw new SeoAuditJobError("JOB_NOT_FOUND");
    const run = await tx.seoAuditRun.findUnique({
      where: { id: input.runId },
      select: {
        id: true,
        status: true,
        leaseTokenHash: true,
        leaseExpiresAt: true,
        creditId: true,
        failureCode: true,
      },
    });
    if (!run) throw new SeoAuditJobError("JOB_NOT_FOUND");
    if (run.status === "failed") {
      if (run.failureCode !== input.failureCode) {
        throw new SeoAuditJobError("JOB_STATE_CONFLICT");
      }
      await tx.seoAuditRun.update({
        where: { id: input.runId },
        data: {
          leaseTokenHash: null,
          leaseExpiresAt: null,
          reportJsonKey: null,
          reportMarkdownKey: null,
          reportSha256: null,
        },
      });
      return { status: "failed" as const, alreadyFailed: true };
    }
    if (run.status === "cancel_requested") {
      await settleCancelledRun(tx, input.runId, now);
      return { status: "cancelled" as const, alreadyFailed: false };
    }
    if (run.status === "cancelled") {
      await settleCancelledRun(tx, input.runId, now);
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
        reportJsonKey: null,
        reportMarkdownKey: null,
        reportSha256: null,
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
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "seo_audit_runs"
      WHERE "id" = ${runId}
      FOR UPDATE
    `);
    if (!locked[0]) throw new SeoAuditJobError("JOB_NOT_FOUND");
    const run = await tx.seoAuditRun.findUnique({
      where: { id: runId },
      select: {
        id: true,
        status: true,
        leaseTokenHash: true,
        leaseExpiresAt: true,
        reportSha256: true,
      },
    });
    if (!run) throw new SeoAuditJobError("JOB_NOT_FOUND");

    if (run.status === "queued") {
      await settleCancelledRun(tx, runId, now);
      return { status: "cancelled" as const };
    }
    if (run.status === "running") {
      await tx.seoAuditRun.update({
        where: { id: runId },
        data: { status: "cancel_requested", cancelRequestedAt: now },
      });
      return { status: "cancel_requested" as const };
    }
    if (run.status === "cancelled") {
      if (run.leaseTokenHash || run.leaseExpiresAt || run.reportSha256) {
        await settleCancelledRun(tx, runId, now);
      }
      return { status: "cancelled" as const };
    }
    if (run.status === "completed" || run.status === "failed") {
      if (run.leaseTokenHash || run.leaseExpiresAt) {
        await tx.seoAuditRun.update({
          where: { id: runId },
          data: { leaseTokenHash: null, leaseExpiresAt: null },
        });
      }
      return { status: run.status };
    }
    return { status: "cancel_requested" as const };
  });
}
