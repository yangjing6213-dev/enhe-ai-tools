import { describe, expect, test } from "vitest";
import type { EbosEvidenceCatalogEntry } from "../../evidence";
import type { EbosDeploymentExecutionStatus } from "../../deployment-execution";
import type { EbosExternalPublishingStatusSummary } from "../../external-publishing";
import type { EbosSyntheticScenarioStatusSummary } from "../../synthetic-scenarios";
import { generateMonthlyReviewPlan } from "../monthly-review-plan";

function entry(kind: EbosEvidenceCatalogEntry["evidenceKind"], overrides: Partial<EbosEvidenceCatalogEntry> = {}): EbosEvidenceCatalogEntry {
  return {
    id: `${kind}:2026-07-03:file.json`,
    filePath: `reports/ebos/evidence/${kind}/file.json`,
    fileName: "file.json",
    evidenceKind: kind,
    contractVersion: "ebos-evidence-v1",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-03T00:00:00.000Z",
    generator: "unit-test",
    score: 80,
    confidence: "partial",
    warningsCount: 0,
    errorsCount: 0,
    actionItemsCount: 0,
    validationStatus: "valid",
    ...overrides
  };
}

function verifiedDeploymentStatus(): EbosDeploymentExecutionStatus {
  return {
    statusType: "production_deployment_execution_status",
    targetDate: "2026-07-03",
    updatedAt: "2026-07-05T00:00:00.000Z",
    deploymentStatus: "verified",
    approvedByUser: true,
    localCommandsRun: [],
    serverCommandsRun: [],
    dockerCommandsRun: [],
    verificationCommandsRun: [],
    postLaunchCheckStatus: "passed",
    notes: [],
    warnings: []
  };
}

function externalStatus(overrides: Partial<EbosExternalPublishingStatusSummary>): EbosExternalPublishingStatusSummary {
  return {
    status: "waiting_real_data",
    channelsCount: 6,
    publishAssetsCount: 6,
    publishCoverage: 0,
    dataCoverage: 0,
    hasRealSignals: false,
    canBackfill: false,
    warnings: [],
    blockers: [],
    summary: "External publish result input exists, but no real external data has been recorded yet.",
    ...overrides
  };
}

function syntheticStatus(overrides: Partial<EbosSyntheticScenarioStatusSummary> = {}): EbosSyntheticScenarioStatusSummary {
  return {
    status: "generated",
    targetDate: "2026-07-03",
    synthetic: true,
    simulated: true,
    scenarioPath: "reports/ebos/external-publishing/simulations/2026-07-03-synthetic-failure-scenario.json",
    analysisPath: "reports/ebos/external-publishing/simulations/2026-07-03-synthetic-failure-analysis.json",
    optimizationPlanPath: "reports/ebos/external-publishing/simulations/2026-07-03-synthetic-optimization-plan.json",
    simulatedRevenue: 0,
    simulatedPaidOrders: 0,
    likelyFailureReasonsCount: 9,
    priorityFixesCount: 7,
    nextExperimentActionsCount: 7,
    warnings: ["This is synthetic data.", "Do not backfill as real data."],
    summary: "Synthetic failure scenario exists. Treat it as simulated planning input only.",
    ...overrides
  };
}

describe("generateMonthlyReviewPlan", () => {
  test("adds revenue evidence OKR when revenue_evidence is missing", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [entry("weekly_report")],
      missingKinds: ["revenue_evidence"],
      openActionItemsCount: 0,
      sampleIsThin: false
    });

    expect(plan.nextMonthOKRs.some((okr) => okr.objective.includes("收入数据证据"))).toBe(true);
  });

  test("adds product conversion OKR when product_evidence is missing", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [entry("weekly_report")],
      missingKinds: ["product_evidence"],
      openActionItemsCount: 0,
      sampleIsThin: false
    });

    expect(plan.nextMonthOKRs.some((okr) => okr.objective.includes("产品转化证据"))).toBe(true);
  });

  test("adds SEO/GEO data-source tasks when seo or geo evidence is missing", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [entry("weekly_report")],
      missingKinds: ["seo_evidence", "geo_evidence"],
      openActionItemsCount: 0,
      sampleIsThin: false
    });

    expect(plan.codexTasks.some((task) => task.title.includes("SEO/GEO"))).toBe(true);
  });

  test("adds market evidence OKR when market_evidence is missing", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [entry("weekly_report")],
      missingKinds: ["market_evidence"],
      openActionItemsCount: 0,
      sampleIsThin: false
    });

    expect(plan.nextMonthOKRs.some((okr) => okr.objective.includes("市场机会证据"))).toBe(true);
  });

  test("assigns high priority to backlog reduction action items", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [entry("weekly_report")],
      missingKinds: [],
      openActionItemsCount: 25,
      sampleIsThin: false
    });

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("减少执行积压"),
      priority: "high"
    }));
  });

  test("creates specific monthly SEO and GEO tasks when evidence exists", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [
        entry("seo_evidence", {
          score: 64,
          actionItemsCount: 1,
          actionItems: [{
            id: "seo-1",
            title: "Add Product schema to software pages",
            description: "Improve structured data coverage.",
            priority: "high",
            owner: "codex",
            status: "open"
          }]
        }),
        entry("geo_evidence", {
          score: 59,
          actionItemsCount: 1,
          actionItems: [{
            id: "geo-1",
            title: "Add FAQ sections for AI answerability",
            description: "Improve answer-engine readiness.",
            priority: "medium",
            owner: "codex",
            status: "open"
          }]
        })
      ],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false
    });

    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("SEO evidence")
    }));
    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("GEO evidence")
    }));
  });

  test("creates specific monthly product tasks when product evidence exists", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [
        entry("product_evidence", {
          score: 62,
          actionItemsCount: 1,
          actionItems: [{
            id: "product-1",
            title: "Add delivery and support copy to product pages",
            description: "Improve product conversion readiness.",
            priority: "high",
            owner: "codex",
            status: "open"
          }]
        })
      ],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false
    });

    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("Product evidence")
    }));
  });

  test("creates first revenue OKR when revenue evidence exists but first revenue is not achieved", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [
        entry("revenue_evidence", {
          score: 42,
          actionItemsCount: 1,
          payloadSummary: {
            firstRevenueAchieved: false,
            paidOrders: 0,
            netRevenue: 0
          },
          actionItems: [{
            id: "revenue-1",
            title: "选择 1-2 个高 readiness 产品进行首批收入验证",
            description: "Complete first paid validation.",
            priority: "high",
            owner: "codex",
            status: "open"
          }]
        })
      ],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false
    });

    expect(plan.nextMonthOKRs.some((okr) => okr.objective.includes("第一批真实收入"))).toBe(true);
    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("Revenue evidence")
    }));
  });

  test("creates concrete market opportunity tasks when market evidence exists", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [
        entry("revenue_evidence", {
          payloadSummary: {
            firstRevenueAchieved: false,
            paidOrders: 1,
            netRevenue: 0
          }
        }),
        entry("market_evidence", {
          score: 76,
          actionItemsCount: 1,
          payloadSummary: {
            recommendedProductDirectionsCount: 2,
            topProductDirections: [
              {
                productDirection: "AI 视频工作流包",
                priorityScore: 82,
                recommendedAction: "validate_first"
              }
            ]
          },
          actionItems: [{
            id: "market-1",
            title: "验证市场机会：AI 视频工作流包",
            description: "Run a low-cost validation offer.",
            priority: "high",
            owner: "codex",
            status: "open"
          }]
        })
      ],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false
    });

    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("Market evidence")
    }));
    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("低成本验证市场机会")
    }));
  });

  test("references external publishing waiting state", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [entry("weekly_report")],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      deploymentExecutionStatus: verifiedDeploymentStatus(),
      externalPublishingStatus: externalStatus({
        status: "waiting_real_data",
        hasRealSignals: false,
        canBackfill: false
      })
    });

    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("等待真实外部渠道数据")
    }));
  });

  test("references external publishing backfill state", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [entry("weekly_report")],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      deploymentExecutionStatus: verifiedDeploymentStatus(),
      externalPublishingStatus: externalStatus({
        status: "ready_to_backfill",
        hasRealSignals: true,
        canBackfill: true,
        dataCoverage: 17,
        summary: "External publish result input contains real observed signals."
      })
    });

    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("backfill")
    }));
  });

  test("references synthetic failure scenario without changing real external signal state", () => {
    const external = externalStatus({
      status: "waiting_real_data",
      hasRealSignals: false,
      canBackfill: false
    });
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [entry("weekly_report")],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      deploymentExecutionStatus: verifiedDeploymentStatus(),
      externalPublishingStatus: external,
      syntheticFailureScenarioStatus: syntheticStatus()
    });

    expect(external.hasRealSignals).toBe(false);
    expect(external.canBackfill).toBe(false);
    expect(plan.codexTasks[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("simulated"),
      reason: expect.stringContaining("simulatedRevenue=0")
    }));
  });

  test("marks synthetic optimization completed while still waiting for real data", () => {
    const external = externalStatus({
      status: "waiting_real_data",
      hasRealSignals: false,
      canBackfill: false
    });
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [entry("weekly_report")],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      deploymentExecutionStatus: verifiedDeploymentStatus(),
      externalPublishingStatus: external,
      syntheticFailureScenarioStatus: syntheticStatus({
        optimizationImplementationPath: "reports/ebos/external-publishing/simulations/2026-07-03-synthetic-optimization-implementation.json",
        optimizationImplementationCompleted: true,
        implementedFixesCount: 7,
        nextRealValidationActionsCount: 6
      })
    });

    expect(external.hasRealSignals).toBe(false);
    expect(external.canBackfill).toBe(false);
    expect(plan.codexTasks[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("real publishing validation"),
      reason: expect.stringContaining("implementedFixes=7")
    }));
    expect(plan.codexTasks[0]?.reason).toContain("hasRealSignals=false");
    expect(plan.codexTasks[0]?.reason).toContain("canBackfill=false");
  });
});
