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
    if (createdRunIds.length) {
      await db.seoAuditRun.deleteMany({ where: { id: { in: createdRunIds } } });
    }
    await db?.$disconnect();
  });

  async function createRun(input: {
    status?: "queued" | "running";
    targetUrl: string;
    leaseToken?: string;
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
        availableAt: now,
        attemptCount: input.leaseToken ? 1 : 0,
        startedAt: input.leaseToken ? now : null,
        engineVersion: input.leaseToken ? "1.4.8" : null,
      },
    });
    createdRunIds.push(run.id);
    return run;
  }

  it("lets only one concurrent claim obtain a queued run", async () => {
    const run = await createRun({
      status: "queued",
      targetUrl: "https://postgres-claim.example/",
    });
    const now = new Date();

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
  });

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
      const storeArtifacts = async () => {
        uploadCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          reportJsonKey: `seo-audit/runs/${run.id}/${parsed.reportSha256}/report.json`,
          reportMarkdownKey: `seo-audit/runs/${run.id}/${parsed.reportSha256}/report.md`,
        };
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
          storeArtifacts: async () => {
            uploadStarted.resolve();
            await releaseUpload.promise;
            return {
              reportJsonKey: `seo-audit/runs/${run.id}/${parsed.reportSha256}/report.json`,
              reportMarkdownKey: `seo-audit/runs/${run.id}/${parsed.reportSha256}/report.md`,
            };
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
          storeArtifacts: async () => {
            uploadStarted.resolve();
            await releaseUpload.promise;
            return {
              reportJsonKey: `seo-audit/runs/${run.id}/${parsed.reportSha256}/report.json`,
              reportMarkdownKey: `seo-audit/runs/${run.id}/${parsed.reportSha256}/report.md`,
            };
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
