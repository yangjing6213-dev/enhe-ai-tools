import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  claimSeoAuditJob,
  completeSeoAuditJob,
  failSeoAuditJob,
  requestSeoAuditJobCancellation,
} from "@/lib/seo-audit/jobs";

const databaseUrl = process.env.SEO_AUDIT_TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;
const completionSummary = {
  score: 93,
  evidenceCoverage: 100,
  pageCount: 1,
  criticalCount: 0,
  highCount: 0,
  mediumCount: 1,
};
const publicFindings = [
  {
    id: "F001",
    code: "sitemap_duplicate_urls",
    severity: "medium" as const,
    issue: "The sitemap contains duplicate URLs.",
  },
];

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function parsedReport(input: {
  targetUrl: string;
  pageLimit: number;
  reportSha256: string;
}) {
  return {
    fullReport: {
      meta: {
        engine_version: "1.4.8",
        target: input.targetUrl,
        max_pages: input.pageLimit,
      },
      pages: [{}],
      summary: { pages_crawled: 1 },
    },
    markdown: "# Report\n",
    reportSha256: input.reportSha256,
    engineVersion: "1.4.8",
    targetUrl: input.targetUrl,
    pageLimit: input.pageLimit,
    summary: completionSummary,
    publicFindings,
  };
}

function uploadKeys(input: {
  runId: string;
  parsed: { reportSha256: string };
  reportJsonKey?: string;
  reportMarkdownKey?: string;
}) {
  const prefix = `seo-audit/runs/${input.runId}/${input.parsed.reportSha256}`;
  return {
    reportJsonKey: input.reportJsonKey ?? `${prefix}/report.json`,
    reportMarkdownKey: input.reportMarkdownKey ?? `${prefix}/report.md`,
  };
}

async function reapPersistedUploads(input: {
  db: PrismaClient;
  now: Date;
  removeArtifacts: (keys: {
    reportJsonKey: string;
    reportMarkdownKey: string;
  }) => Promise<void>;
}) {
  const jobs = (await import("@/lib/seo-audit/jobs")) as unknown as {
    reapSeoAuditArtifactUploads: (options: {
      db: PrismaClient;
      now: Date;
      removeArtifacts: typeof input.removeArtifacts;
    }) => Promise<{ cleaned: number; failed: number }>;
  };
  return jobs.reapSeoAuditArtifactUploads(input);
}

describePostgres("PostgreSQL SEO audit job concurrency", () => {
  let db: PrismaClient;
  const createdRunIds: string[] = [];

  beforeAll(() => {
    db = new PrismaClient({
      datasourceUrl: databaseUrl,
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
  });

  afterAll(async () => {
    const artifactUploads = (
      db as unknown as {
        seoAuditArtifactUpload?: {
          deleteMany: (input: {
            where: { runId: { in: string[] } };
          }) => Promise<unknown>;
        };
      }
    ).seoAuditArtifactUpload;
    if (createdRunIds.length) {
      await artifactUploads?.deleteMany({
        where: { runId: { in: createdRunIds } },
      });
      await db.seoAuditRun.deleteMany({ where: { id: { in: createdRunIds } } });
    }
    await db?.$disconnect();
  });

  async function createRun(input: {
    status?: "queued" | "running";
    targetUrl: string;
    leaseToken?: string;
    availableAt?: Date;
  }) {
    const now = new Date();
    const leaseTokenHash = input.leaseToken
      ? createHash("sha256").update(input.leaseToken).digest("hex")
      : null;
    const run = await db.seoAuditRun.create({
      data: {
        status: input.status ?? "running",
        kind: "free",
        targetUrl: input.targetUrl,
        normalizedOrigin: new URL(input.targetUrl).origin,
        pageLimit: 10,
        totalTimeoutSeconds: 720,
        leaseTokenHash,
        leaseExpiresAt: input.leaseToken
          ? new Date(now.getTime() + 5 * 60_000)
          : null,
        availableAt: input.availableAt ?? now,
        attemptCount: input.leaseToken ? 1 : 0,
        startedAt: input.leaseToken ? now : null,
        engineVersion: input.leaseToken ? "1.4.8" : null,
      },
    });
    createdRunIds.push(run.id);
    return run;
  }

  it(
    "lets only one concurrent claim obtain a queued run",
    async () => {
      const now = new Date("2000-01-01T00:00:00.000Z");
      const run = await createRun({
        status: "queued",
        targetUrl: "https://postgres-claim.example/",
        availableAt: now,
      });

      const claimed = await Promise.all([
        claimSeoAuditJob(
          { workerId: "postgres-worker-a", engineVersion: "1.4.8" },
          { db, now, randomBytes: () => Buffer.alloc(32, 1) },
        ),
        claimSeoAuditJob(
          { workerId: "postgres-worker-b", engineVersion: "1.4.8" },
          { db, now, randomBytes: () => Buffer.alloc(32, 2) },
        ),
      ]);

      expect(claimed.filter(Boolean)).toHaveLength(1);
      expect(claimed.find(Boolean)?.id).toBe(run.id);
      expect(
        await db.seoAuditRun.findUniqueOrThrow({ where: { id: run.id } }),
      ).toMatchObject({ status: "running", attemptCount: 1 });
    },
    30_000,
  );

  it(
    "uploads once for concurrent identical completions and accepts a historical retry after lease cleanup",
    async () => {
      const now = new Date();
      const leaseToken = "postgres-lease-token-12345678901234567890";
      const run = await createRun({
        targetUrl: "https://postgres-complete.example/",
        leaseToken,
      });
      const parsed = parsedReport({
        targetUrl: run.targetUrl,
        pageLimit: run.pageLimit,
        reportSha256: "b".repeat(64),
      });
      let uploadCount = 0;
      const storeArtifacts = async (input: {
        runId: string;
        parsed: { reportSha256: string };
        reportJsonKey: string;
        reportMarkdownKey: string;
      }) => {
        uploadCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return uploadKeys(input);
      };
      const input = {
        runId: run.id,
        leaseToken,
        reportGzipBase64: "integration-bundle",
        summary: completionSummary,
      };
      const options = {
        db,
        now,
        parseReport: async () => parsed,
        storeArtifacts,
        completionPollIntervalMs: 10,
      };

      const results = await Promise.all([
        completeSeoAuditJob(input, options),
        completeSeoAuditJob(input, options),
      ]);
      const historicalRetry = await completeSeoAuditJob(input, options);
      const stored = await db.seoAuditRun.findUniqueOrThrow({
        where: { id: run.id },
      });

      expect(results.map((result) => result.status)).toEqual([
        "completed",
        "completed",
      ]);
      expect(
        results.map((result) => result.alreadyCompleted).sort(),
      ).toEqual([false, true]);
      expect(historicalRetry).toEqual({
        status: "completed",
        alreadyCompleted: true,
      });
      expect(uploadCount).toBe(1);
      expect(stored.status).toBe("completed");
      expect(stored.leaseTokenHash).toBeNull();
      expect(stored.leaseExpiresAt).toBeNull();
      expect(stored.reportSha256).toBe(parsed.reportSha256);
      expect(stored.summaryScore).toBe(completionSummary.score);
      expect(stored.summaryFindings).toEqual(publicFindings);
    },
    30_000,
  );

  it(
    "never lets a stale reservation delete the takeover winner's readable objects",
    async () => {
      const startedAt = new Date();
      const takeoverAt = new Date(startedAt.getTime() + 66_000);
      const cleanupAt = new Date(startedAt.getTime() + 10 * 60_000);
      const leaseToken = "postgres-takeover-token-12345678901234567890";
      const run = await createRun({
        targetUrl: "https://postgres-takeover.example/private?token=hidden",
        leaseToken,
      });
      const parsed = parsedReport({
        targetUrl: run.targetUrl,
        pageLimit: run.pageLimit,
        reportSha256: "e".repeat(64),
      });
      const firstUploadStarted = deferred();
      const releaseFirstUpload = deferred();
      const winnerUploaded = deferred();
      const releaseWinnerUpload = deferred();
      const objects = new Map<string, string>();
      const uploads: Array<{
        reportJsonKey: string;
        reportMarkdownKey: string;
      }> = [];
      let uploadCount = 0;
      const storeArtifacts = async (input: {
        runId: string;
        parsed: { reportSha256: string };
        reportJsonKey?: string;
        reportMarkdownKey?: string;
      }) => {
        uploadCount += 1;
        const keys = uploadKeys(input);
        uploads.push(keys);
        if (uploadCount === 1) {
          firstUploadStarted.resolve();
          await releaseFirstUpload.promise;
          objects.set(keys.reportJsonKey, "stale-json");
          objects.set(keys.reportMarkdownKey, "stale-markdown");
        } else {
          objects.set(keys.reportJsonKey, "winner-json");
          objects.set(keys.reportMarkdownKey, "winner-markdown");
          winnerUploaded.resolve();
          await releaseWinnerUpload.promise;
        }
        return keys;
      };
      const removeArtifacts = vi.fn(async (keys: {
        reportJsonKey: string;
        reportMarkdownKey: string;
      }) => {
        objects.delete(keys.reportJsonKey);
        objects.delete(keys.reportMarkdownKey);
      });
      const completionInput = {
        runId: run.id,
        leaseToken,
        reportGzipBase64: "integration-bundle",
        summary: completionSummary,
      };

      const staleCompletion = completeSeoAuditJob(completionInput, {
        db,
        now: startedAt,
        parseReport: async () => parsed,
        storeArtifacts,
        removeArtifacts,
        randomBytes: () => Buffer.alloc(24, 1),
      });
      await firstUploadStarted.promise;
      const winnerCompletion = completeSeoAuditJob(completionInput, {
        db,
        now: takeoverAt,
        parseReport: async () => parsed,
        storeArtifacts,
        removeArtifacts,
        randomBytes: () => Buffer.alloc(24, 2),
      });
      await winnerUploaded.promise;

      releaseFirstUpload.resolve();
      await expect(staleCompletion).rejects.toMatchObject({
        code: "JOB_STATE_CONFLICT",
      });
      releaseWinnerUpload.resolve();
      await expect(winnerCompletion).resolves.toEqual({
        status: "completed",
        alreadyCompleted: false,
      });

      const completed = await db.seoAuditRun.findUniqueOrThrow({
        where: { id: run.id },
      });
      expect(completed.reportJsonKey).toBeTruthy();
      expect(completed.reportMarkdownKey).toBeTruthy();
      expect(objects.get(completed.reportJsonKey!)).toBe("winner-json");
      expect(objects.get(completed.reportMarkdownKey!)).toBe(
        "winner-markdown",
      );
      expect(uploads[0]).not.toEqual(uploads[1]);

      await expect(
        reapPersistedUploads({ db, now: cleanupAt, removeArtifacts }),
      ).resolves.toMatchObject({ cleaned: 1, failed: 0 });
      expect(objects.get(completed.reportJsonKey!)).toBe("winner-json");
      expect(objects.get(completed.reportMarkdownKey!)).toBe(
        "winner-markdown",
      );
    },
    30_000,
  );

  it(
    "persistently and idempotently reaps objects that arrive after upload timeout",
    async () => {
      const startedAt = new Date();
      const cleanupAt = new Date(startedAt.getTime() + 10 * 60_000);
      const leaseToken = "postgres-late-upload-token-123456789012345678";
      const run = await createRun({
        targetUrl: "https://postgres-late.example/private?token=hidden",
        leaseToken,
      });
      const parsed = parsedReport({
        targetUrl: run.targetUrl,
        pageLimit: run.pageLimit,
        reportSha256: "f".repeat(64),
      });
      const lateUploadFinished = deferred();
      const objects = new Map<string, string>();
      let timedOutKeys: ReturnType<typeof uploadKeys> | null = null;
      const removeArtifacts = vi.fn(async (keys: {
        reportJsonKey: string;
        reportMarkdownKey: string;
      }) => {
        objects.delete(keys.reportJsonKey);
        objects.delete(keys.reportMarkdownKey);
      });

      await expect(
        completeSeoAuditJob(
          {
            runId: run.id,
            leaseToken,
            reportGzipBase64: "integration-bundle",
            summary: completionSummary,
          },
          {
            db,
            now: startedAt,
            parseReport: async () => parsed,
            randomBytes: () => Buffer.alloc(24, 3),
            storeArtifacts: async (input) => {
              timedOutKeys = uploadKeys(input);
              setTimeout(() => {
                objects.set(timedOutKeys!.reportJsonKey, "late-json");
                objects.set(timedOutKeys!.reportMarkdownKey, "late-markdown");
                lateUploadFinished.resolve();
              }, 20);
              throw Object.assign(new Error("simulated upload timeout"), {
                code: "ARTIFACT_UPLOAD_FAILED",
              });
            },
            removeArtifacts,
          },
        ),
      ).rejects.toMatchObject({ code: "ARTIFACT_UPLOAD_FAILED" });
      await lateUploadFinished.promise;
      expect(objects.size).toBe(2);

      const artifactUploads = (
        db as unknown as {
          seoAuditArtifactUpload: {
            findMany: (input: unknown) => Promise<Array<{ id: string }>>;
          };
        }
      ).seoAuditArtifactUpload;
      await expect(
        artifactUploads.findMany({ where: { runId: run.id } }),
      ).resolves.toHaveLength(1);

      await expect(
        reapPersistedUploads({ db, now: cleanupAt, removeArtifacts }),
      ).resolves.toMatchObject({ cleaned: 1, failed: 0 });
      expect(objects.size).toBe(0);
      await expect(
        artifactUploads.findMany({ where: { runId: run.id } }),
      ).resolves.toHaveLength(0);
      await expect(
        reapPersistedUploads({ db, now: cleanupAt, removeArtifacts }),
      ).resolves.toMatchObject({ cleaned: 0, failed: 0 });
      expect(removeArtifacts).toHaveBeenCalledTimes(1);
    },
    30_000,
  );

  it(
    "does not reap the current reservation while its worker lease is still live",
    async () => {
      const startedAt = new Date();
      const reapAt = new Date(startedAt.getTime() + 60_000);
      const leaseToken = "postgres-live-upload-token-123456789012345678";
      const run = await createRun({
        targetUrl: "https://postgres-live-upload.example/",
        leaseToken,
      });
      const parsed = parsedReport({
        targetUrl: run.targetUrl,
        pageLimit: run.pageLimit,
        reportSha256: "1".repeat(64),
      });
      const uploadStarted = deferred();
      const releaseUpload = deferred();
      const removeArtifacts = vi.fn().mockResolvedValue(undefined);
      const completion = completeSeoAuditJob(
        {
          runId: run.id,
          leaseToken,
          reportGzipBase64: "integration-bundle",
          summary: completionSummary,
        },
        {
          db,
          now: startedAt,
          parseReport: async () => parsed,
          storeArtifacts: async (input) => {
            uploadStarted.resolve();
            await releaseUpload.promise;
            return uploadKeys(input);
          },
          removeArtifacts,
        },
      );

      await uploadStarted.promise;
      await db.seoAuditArtifactUpload.updateMany({
        where: { runId: run.id },
        data: { cleanupAfter: new Date(startedAt.getTime() - 1_000) },
      });
      await expect(
        reapPersistedUploads({ db, now: reapAt, removeArtifacts }),
      ).resolves.toEqual({ cleaned: 0, failed: 0 });
      expect(removeArtifacts).not.toHaveBeenCalled();
      await expect(
        db.seoAuditArtifactUpload.findMany({ where: { runId: run.id } }),
      ).resolves.toHaveLength(1);

      releaseUpload.resolve();
      await expect(completion).resolves.toEqual({
        status: "completed",
        alreadyCompleted: false,
      });
      await expect(
        db.seoAuditArtifactUpload.findMany({ where: { runId: run.id } }),
      ).resolves.toHaveLength(0);
    },
    30_000,
  );

  it(
    "lets cancellation win while artifact upload is blocked outside the row-lock transaction",
    async () => {
      const now = new Date();
      const leaseToken = "postgres-cancel-token-12345678901234567890";
      const run = await createRun({
        targetUrl: "https://postgres-cancel.example/",
        leaseToken,
      });
      const parsed = parsedReport({
        targetUrl: run.targetUrl,
        pageLimit: run.pageLimit,
        reportSha256: "c".repeat(64),
      });
      const uploadStarted = deferred();
      const releaseUpload = deferred();
      const removeArtifacts = vi.fn().mockResolvedValue(undefined);
      const completion = completeSeoAuditJob(
        {
          runId: run.id,
          leaseToken,
          reportGzipBase64: "integration-bundle",
          summary: completionSummary,
        },
        {
          db,
          now,
          parseReport: async () => parsed,
          storeArtifacts: async (input) => {
            uploadStarted.resolve();
            await releaseUpload.promise;
            return uploadKeys(input);
          },
          removeArtifacts,
        },
      );

      await uploadStarted.promise;
      await expect(
        requestSeoAuditJobCancellation(run.id, { db, now }),
      ).resolves.toEqual({ status: "cancel_requested" });
      releaseUpload.resolve();

      await expect(completion).rejects.toMatchObject({
        code: "JOB_CANCELLED",
      });
      expect(removeArtifacts).toHaveBeenCalledTimes(1);
      expect(
        await db.seoAuditRun.findUniqueOrThrow({ where: { id: run.id } }),
      ).toMatchObject({
        status: "cancelled",
        leaseTokenHash: null,
        leaseExpiresAt: null,
        reportJsonKey: null,
        reportMarkdownKey: null,
        reportSha256: null,
      });
    },
    30_000,
  );

  it(
    "lets failure finish while artifact upload is blocked and cleans the losing upload",
    async () => {
      const now = new Date();
      const leaseToken = "postgres-failure-token-12345678901234567890";
      const run = await createRun({
        targetUrl: "https://postgres-failure.example/",
        leaseToken,
      });
      const parsed = parsedReport({
        targetUrl: run.targetUrl,
        pageLimit: run.pageLimit,
        reportSha256: "d".repeat(64),
      });
      const uploadStarted = deferred();
      const releaseUpload = deferred();
      const removeArtifacts = vi.fn().mockResolvedValue(undefined);
      const completion = completeSeoAuditJob(
        {
          runId: run.id,
          leaseToken,
          reportGzipBase64: "integration-bundle",
          summary: completionSummary,
        },
        {
          db,
          now,
          parseReport: async () => parsed,
          storeArtifacts: async (input) => {
            uploadStarted.resolve();
            await releaseUpload.promise;
            return uploadKeys(input);
          },
          removeArtifacts,
        },
      );

      await uploadStarted.promise;
      await expect(
        failSeoAuditJob(
          { runId: run.id, leaseToken, failureCode: "SYSTEM_TIMEOUT" },
          { db, now },
        ),
      ).resolves.toEqual({ status: "failed", alreadyFailed: false });
      releaseUpload.resolve();

      await expect(completion).rejects.toMatchObject({
        code: "JOB_STATE_CONFLICT",
      });
      expect(removeArtifacts).toHaveBeenCalledTimes(1);
      expect(
        await db.seoAuditRun.findUniqueOrThrow({ where: { id: run.id } }),
      ).toMatchObject({
        status: "failed",
        leaseTokenHash: null,
        leaseExpiresAt: null,
        reportJsonKey: null,
        reportMarkdownKey: null,
        reportSha256: null,
      });
    },
    30_000,
  );

  it("atomically turns cancel_requested into cancelled when fail arrives", async () => {
    const now = new Date();
    const leaseToken = "postgres-cancel-fail-token-1234567890123456";
    const run = await createRun({
      targetUrl: "https://postgres-cancel-fail.example/",
      leaseToken,
    });

    await requestSeoAuditJobCancellation(run.id, { db, now });
    await expect(
      failSeoAuditJob(
        { runId: run.id, leaseToken, failureCode: "SYSTEM_INTERNAL" },
        { db, now },
      ),
    ).resolves.toEqual({ status: "cancelled", alreadyFailed: false });
    expect(
      await db.seoAuditRun.findUniqueOrThrow({ where: { id: run.id } }),
    ).toMatchObject({
      status: "cancelled",
      leaseTokenHash: null,
      leaseExpiresAt: null,
    });
  });
});
