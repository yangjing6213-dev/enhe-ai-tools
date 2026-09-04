import { describe, expect, test } from "vitest";
import { createEmptyEbosReport } from "../../report-schema";
import { createNoRevenueWarning } from "../../warnings";
import type { EbosDeploymentExecutionStatus } from "../../deployment-execution";
import type { EbosExternalPublishingStatusSummary } from "../../external-publishing";
import type { EbosSyntheticScenarioStatusSummary } from "../../synthetic-scenarios";
import { generateNextWeekPlan } from "../weekly-report-plan";

function weeklyReport() {
  return createEmptyEbosReport("weekly", new Date(2026, 6, 2, 10, 0));
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

describe("generateNextWeekPlan", () => {
  test("prioritizes first real revenue when revenue is zero", () => {
    const report = weeklyReport();
    report.sections = report.sections.map((section) =>
      section.key === "revenue"
        ? {
            ...section,
            score: 25,
            grade: "critical",
            warnings: [createNoRevenueWarning()]
          }
        : section
    );

    const plan = generateNextWeekPlan(report);

    expect(plan.okrs[0]?.keyResults.length).toBeGreaterThan(0);
    expect(plan.actionItems[0]).toMatchObject({
      sectionKey: "revenue",
      priority: "high"
    });
  });

  test("adds data integration tasks when SEO and GEO confidence is low", () => {
    const plan = generateNextWeekPlan(weeklyReport());

    expect(plan.actionItems.some((item) => item.title.includes("Search Console"))).toBe(true);
    expect(plan.actionItems.some((item) => item.title.includes("AI Search Probe"))).toBe(true);
  });

  test("adds a product 404 repair task for sitemap sourced failures", () => {
    const report = weeklyReport();
    report.sections = report.sections.map((section) =>
      section.key === "website_health"
        ? {
            ...section,
            risks: ["Revenue path risk: sitemap-sourced key_product_pages failed with HTTP 404."]
          }
        : section
    );

    const plan = generateNextWeekPlan(report);

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      sectionKey: "website_health",
      priority: "high",
      title: expect.stringContaining("product detail page 404")
    }));
  });

  test("adds an environment alignment task for database URL mismatch failures", () => {
    const report = weeklyReport();
    report.sections = report.sections.map((section) =>
      section.key === "website_health"
        ? {
            ...section,
            risks: ["Data source risk: URL source may not match checked environment."]
          }
        : section
    );

    const plan = generateNextWeekPlan(report);

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      sectionKey: "website_health",
      priority: "medium",
      title: expect.stringContaining("Align EBOS checked environment")
    }));
  });

  test("promotes existing SEO and GEO evidence action items into concrete weekly tasks", () => {
    const report = weeklyReport();
    report.sections = report.sections.map((section) => {
      if (section.key === "seo") {
        return {
          ...section,
          score: 62,
          confidence: "partial",
          findings: ["seo_evidence is available from reports/ebos/evidence/seo_evidence/file.json."],
          actionItems: [
            {
              title: "Add Product schema to software pages",
              priority: "high",
              sectionKey: "seo",
              status: "open",
              verification: "Next seo_evidence report shows Product schema coverage."
            }
          ]
        };
      }

      if (section.key === "geo") {
        return {
          ...section,
          score: 58,
          confidence: "partial",
          findings: ["geo_evidence is available from reports/ebos/evidence/geo_evidence/file.json."],
          actionItems: [
            {
              title: "Add FAQ sections for answerability",
              priority: "medium",
              sectionKey: "geo",
              status: "open",
              verification: "Next geo_evidence report shows FAQ coverage."
            }
          ]
        };
      }

      return section;
    });

    const plan = generateNextWeekPlan(report);

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("Add Product schema")
    }));
    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("Add FAQ sections")
    }));
  });

  test("promotes existing product evidence action items into concrete weekly tasks", () => {
    const report = weeklyReport();
    report.sections = report.sections.map((section) => {
      if (section.key === "revenue" || section.key === "traffic") {
        return { ...section, score: 80, confidence: "complete" };
      }

      if (section.key === "seo" || section.key === "geo") {
        return { ...section, score: 85, confidence: "complete" };
      }

      if (section.key === "product") {
        return {
          ...section,
          score: 68,
          confidence: "partial",
          findings: ["product_evidence is available from reports/ebos/evidence/product_evidence/file.json."],
          actionItems: [
            {
              title: "Add delivery and support copy to product pages",
              priority: "high",
              sectionKey: "product",
              status: "open",
              verification: "Next product_evidence report shows delivery coverage."
            }
          ]
        };
      }

      return section;
    });

    const plan = generateNextWeekPlan(report);

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      sectionKey: "product",
      title: expect.stringContaining("delivery and support")
    }));
  });

  test("turns revenue evidence without first revenue into first-revenue validation work", () => {
    const report = weeklyReport();
    report.sections = report.sections.map((section) => {
      if (section.key === "revenue") {
        return {
          ...section,
          score: 42,
          confidence: "partial",
          findings: ["revenue_evidence is available. firstRevenueAchieved=false."],
          actionItems: [
            {
              title: "选择 1-2 个高 readiness 产品进行首批收入验证",
              priority: "high",
              sectionKey: "revenue",
              status: "open",
              verification: "Next revenue_evidence shows firstRevenueAchieved=true."
            }
          ]
        };
      }

      return section;
    });

    const plan = generateNextWeekPlan(report);

    expect(plan.okrs[0]?.objective).toContain("第一批真实收入");
    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      sectionKey: "revenue",
      title: expect.stringContaining("1-2")
    }));
  });

  test("promotes market evidence product directions into weekly tasks", () => {
    const report = weeklyReport();
    report.sections = report.sections.map((section) => {
      if (section.key === "market") {
        return {
          ...section,
          score: 76,
          confidence: "partial",
          findings: ["market_evidence is available from reports/ebos/evidence/market_evidence/file.json."],
          actionItems: [
            {
              title: "验证市场机会：AI 视频工作流包",
              priority: "high",
              sectionKey: "market",
              status: "open",
              verification: "Next market_evidence shows validation result."
            }
          ]
        };
      }

      return section;
    });

    const plan = generateNextWeekPlan(report);

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      sectionKey: "market",
      title: expect.stringContaining("AI 视频工作流包")
    }));
  });

  test("shows waiting state when external publish result has no real signals", () => {
    const plan = generateNextWeekPlan(
      weeklyReport(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      verifiedDeploymentStatus(),
      undefined,
      externalStatus({ status: "waiting_real_data", hasRealSignals: false, canBackfill: false })
    );

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("等待真实外部渠道数据")
    }));
  });

  test("prompts dry-run backfill when external publish result has real signals", () => {
    const plan = generateNextWeekPlan(
      weeklyReport(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      verifiedDeploymentStatus(),
      undefined,
      externalStatus({
        status: "ready_to_backfill",
        publishCoverage: 50,
        dataCoverage: 17,
        hasRealSignals: true,
        canBackfill: true,
        summary: "External publish result input contains real observed signals."
      })
    );

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("dry-run")
    }));
  });

  test("references synthetic failure scenario without changing real external signal state", () => {
    const external = externalStatus({
      status: "waiting_real_data",
      hasRealSignals: false,
      canBackfill: false
    });
    const plan = generateNextWeekPlan(
      weeklyReport(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      verifiedDeploymentStatus(),
      undefined,
      external,
      syntheticStatus()
    );

    expect(external.hasRealSignals).toBe(false);
    expect(external.canBackfill).toBe(false);
    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("simulated"),
      description: expect.stringContaining("must not be backfilled")
    }));
  });

  test("marks synthetic optimization completed while still waiting for real data", () => {
    const external = externalStatus({
      status: "waiting_real_data",
      hasRealSignals: false,
      canBackfill: false
    });
    const plan = generateNextWeekPlan(
      weeklyReport(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      verifiedDeploymentStatus(),
      undefined,
      external,
      syntheticStatus({
        optimizationImplementationPath: "reports/ebos/external-publishing/simulations/2026-07-03-synthetic-optimization-implementation.json",
        optimizationImplementationCompleted: true,
        implementedFixesCount: 7,
        nextRealValidationActionsCount: 6
      })
    );

    expect(external.hasRealSignals).toBe(false);
    expect(external.canBackfill).toBe(false);
    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("real publishing validation"),
      description: expect.stringContaining("implementedFixes=7")
    }));
    expect(plan.actionItems[0]?.description).toContain("hasRealSignals=false");
    expect(plan.actionItems[0]?.description).toContain("canBackfill=false");
  });
});
