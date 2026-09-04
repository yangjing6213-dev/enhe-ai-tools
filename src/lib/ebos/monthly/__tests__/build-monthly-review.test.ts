import { describe, expect, test } from "vitest";
import type {
  EbosEvidenceCatalog,
  EbosEvidenceCatalogEntry
} from "../../evidence";
import type { EbosDeploymentExecutionStatus } from "../../deployment-execution";
import { summarizeEvidenceCatalog } from "../../evidence";
import { buildMonthlyEbosReview } from "../build-monthly-review";

function entry(overrides: Partial<EbosEvidenceCatalogEntry>): EbosEvidenceCatalogEntry {
  const kind = overrides.evidenceKind ?? "health_snapshot";
  const targetDate = overrides.targetDate ?? "2026-07-03";
  const fileName = overrides.fileName ?? `${targetDate}-${kind}.json`;
  return {
    id: `${kind}:${targetDate}:${fileName}`,
    filePath: `reports/ebos/evidence/${kind}/${fileName}`,
    fileName,
    evidenceKind: kind,
    contractVersion: "ebos-evidence-v1",
    targetDate,
    generatedAt: "2026-07-03T00:00:00.000Z",
    generator: "unit-test",
    score: 91,
    confidence: "partial",
    warningsCount: 0,
    errorsCount: 0,
    actionItemsCount: 0,
    validationStatus: "valid",
    ...overrides
  };
}

function catalog(entries: EbosEvidenceCatalogEntry[]): EbosEvidenceCatalog {
  return {
    catalogVersion: "ebos-evidence-catalog-v1",
    generatedAt: "2026-07-03T00:00:00.000Z",
    rootDir: "reports/ebos/evidence",
    totalEntries: entries.length,
    entries,
    summary: summarizeEvidenceCatalog(entries)
  };
}

function deploymentExecutionStatus(): EbosDeploymentExecutionStatus {
  return {
    statusType: "production_deployment_execution_status",
    targetDate: "2026-07-03",
    updatedAt: "2026-07-04T15:33:18.303Z",
    deploymentStatus: "approved_not_executed",
    approvedByUser: true,
    approvedAt: "2026-07-04T15:33:18.303Z",
    localCommandsRun: [],
    serverCommandsRun: [],
    dockerCommandsRun: [],
    verificationCommandsRun: [],
    postLaunchCheckStatus: "not_run",
    notes: [],
    warnings: []
  };
}

describe("buildMonthlyEbosReview", () => {
  test("builds a monthly review from catalog evidence", async () => {
    const review = await buildMonthlyEbosReview({
      targetDate: new Date("2026-07-15T12:00:00+08:00"),
      catalog: catalog([
        entry({ evidenceKind: "health_snapshot", score: 91 }),
        entry({ evidenceKind: "data_source_readiness", score: undefined, warningsCount: 8 }),
        entry({ evidenceKind: "weekly_report", score: 57, actionItemsCount: 25 })
      ])
    });

    expect(review.reportType).toBe("monthly");
    expect(review.targetMonth).toBe("2026-07");
    expect(review.evidenceUsed).toHaveLength(3);
    expect(review.overallScore).toBe(74);
    expect(review.executiveSummary).toContain("样本不足");
  });

  test("does not crash when catalog is empty", async () => {
    const review = await buildMonthlyEbosReview({
      targetDate: new Date("2026-07-15T12:00:00+08:00"),
      catalog: catalog([])
    });

    expect(review.evidenceUsed).toEqual([]);
    expect(review.dataGaps.length).toBeGreaterThan(0);
    expect(review.warnings.some((warning) => warning.message.includes("样本不足"))).toBe(true);
  });

  test("creates data gaps when required evidence is missing", async () => {
    const review = await buildMonthlyEbosReview({
      targetDate: new Date("2026-07-15T12:00:00+08:00"),
      catalog: catalog([entry({ evidenceKind: "health_snapshot", score: 91 })])
    });

    expect(review.dataGaps).toContain("缺少 data_source_readiness evidence。");
    expect(review.dataGaps).toContain("缺少 weekly_report evidence。");
  });

  test("turns high health score into a major win", async () => {
    const review = await buildMonthlyEbosReview({
      targetDate: new Date("2026-07-15T12:00:00+08:00"),
      catalog: catalog([entry({ evidenceKind: "health_snapshot", score: 91 })])
    });

    expect(review.majorWins.some((item) => item.title.includes("技术健康基础较好"))).toBe(true);
  });

  test("adds growth opportunity when revenue and product evidence are missing", async () => {
    const review = await buildMonthlyEbosReview({
      targetDate: new Date("2026-07-15T12:00:00+08:00"),
      catalog: catalog([entry({ evidenceKind: "weekly_report", score: 57 })])
    });

    expect(review.growthOpportunities.some((item) => item.title.includes("收入与产品转化证据"))).toBe(true);
  });

  test("adds execution backlog risk when open action items are high", async () => {
    const review = await buildMonthlyEbosReview({
      targetDate: new Date("2026-07-15T12:00:00+08:00"),
      catalog: catalog([entry({ evidenceKind: "weekly_report", score: 57, actionItemsCount: 25 })])
    });

    expect(review.majorRisks.some((item) => item.title.includes("执行积压风险"))).toBe(true);
  });

  test("keeps deployment execution status in the monthly review payload", async () => {
    const status = deploymentExecutionStatus();
    const review = await buildMonthlyEbosReview({
      targetDate: new Date("2026-07-15T12:00:00+08:00"),
      catalog: catalog([]),
      deploymentExecutionStatus: status
    });

    expect(review.deploymentExecutionStatus).toMatchObject({
      deploymentStatus: "approved_not_executed",
      approvedByUser: true,
      approvedAt: "2026-07-04T15:33:18.303Z"
    });
    expect(review.codexTasks[0]?.title).toBe("Execute approved deployment and run post-launch verification");
  });
});
