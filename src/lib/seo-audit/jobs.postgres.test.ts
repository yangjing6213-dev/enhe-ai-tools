import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { completeSeoAuditJob } from "@/lib/seo-audit/jobs";

const databaseUrl = process.env.SEO_AUDIT_TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;
const completionSummary = {
  score: 93,
  evidenceCoverage: 100,
  pageCount: 1,
  criticalCount: 0,
  highCount: 0,
  mediumCount: 1,
  findings: [{ id: "F001", severity: "medium" as const, issue: "Issue" }],
};
const parsedReport = {
  fullReport: { meta: { engine_version: "1.4.8" } },
  markdown: "# Report\n",
  reportSha256: "b".repeat(64),
  engineVersion: "1.4.8",
  summary: completionSummary,
};

describePostgres("PostgreSQL SEO audit completion concurrency", () => {
  let db: PrismaClient;

  beforeAll(() => {
    db = new PrismaClient({
      datasourceUrl: databaseUrl,
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
  });

  afterAll(async () => {
    await db?.$disconnect();
  });

  it(
    "returns completed to both same-lease callers while uploading once",
    async () => {
      const now = new Date();
      const leaseToken = "postgres-lease-token-12345678901234567890";
      const leaseTokenHash = createHash("sha256")
        .update(leaseToken)
        .digest("hex");
      const run = await db.seoAuditRun.create({
        data: {
          status: "running",
          kind: "free",
          targetUrl: "https://postgres-complete.example/",
          normalizedOrigin: "https://postgres-complete.example",
          pageLimit: 10,
          totalTimeoutSeconds: 720,
          leaseTokenHash,
          leaseExpiresAt: new Date(now.getTime() + 5 * 60_000),
          availableAt: now,
          attemptCount: 1,
          startedAt: now,
          engineVersion: "1.4.8",
        },
      });
      let uploadCount = 0;
      const parseReport = async () => parsedReport;
      const storeArtifacts = async () => {
        uploadCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          reportJsonKey: `seo-audit/runs/${run.id}/${parsedReport.reportSha256}/report.json`,
          reportMarkdownKey: `seo-audit/runs/${run.id}/${parsedReport.reportSha256}/report.md`,
          reportSha256: parsedReport.reportSha256,
          engineVersion: parsedReport.engineVersion,
          summary: parsedReport.summary,
        };
      };
      const input = {
        runId: run.id,
        leaseToken,
        reportGzipBase64: "integration-bundle",
        summary: completionSummary,
      };

      try {
        const results = await Promise.all([
          completeSeoAuditJob(input, {
            db,
            now,
            parseReport,
            storeArtifacts,
          }),
          completeSeoAuditJob(input, {
            db,
            now,
            parseReport,
            storeArtifacts,
          }),
        ]);
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
        expect(uploadCount).toBe(1);
        expect(stored.status).toBe("completed");
        expect(stored.leaseTokenHash).toBe(leaseTokenHash);
        expect(stored.leaseExpiresAt).toBeNull();
        expect(stored.reportSha256).toBe(parsedReport.reportSha256);
        expect(stored.summaryScore).toBe(completionSummary.score);
      } finally {
        await db.seoAuditRun.deleteMany({ where: { id: run.id } });
      }
    },
    30_000,
  );
});
