import { describe, expect, test } from "vitest";
import { createDataSourceState } from "../../data-source";
import { createCommandHealthResult, createSmokeCheckResult } from "../../health";
import { checkEbosIntegrationReadiness } from "../../integrations";
import { buildWeeklyEbosReport } from "../build-weekly-report";
import type { EbosWeeklyDataAdapter } from "../../adapters/adapter-types";
import type { EbosDeploymentExecutionStatus } from "../../deployment-execution";
import type { EbosEvidenceCatalogEntry } from "../../evidence";

function createEmptyAdapter(): EbosWeeklyDataAdapter {
  return {
    key: "internal_database",
    readWeeklySnapshot: async () => ({
      dataSource: createDataSourceState("internal_database", "available"),
      snapshot: {
        products: {
          totalProducts: 0,
          publishedProducts: 0,
          newProductsThisWeek: 0,
          totalDownloads: 0,
          totalUsage: 0
        },
        orders: {
          totalOrders: 0,
          weeklyOrders: 0,
          paidOrders: 0,
          weeklyRevenue: 0,
          previousWeeklyRevenue: 0,
          refunds: 0
        },
        content: {
          aiNewsArticles: 0,
          newAiNewsThisWeek: 0,
          aiTrendBriefings: 0,
          newAiTrendBriefingsThisWeek: 0
        },
        seo: {
          seoLandingViews: 0,
          organicLandings: 0,
          aiAnswerLandings: 0,
          searchEvents: 0,
          conversionEvents: 0
        },
        geo: {
          queries: 0,
          providers: 0,
          reviewedResults: 0,
          brandMentionRate: 0,
          domainCitationRate: 0,
          openRecommendations: 0
        },
        websiteHealth: {
          users: 0,
          weeklyUsers: 0,
          analyticsEvents: 0,
          pendingBaiduPushItems: 0,
          comments: 0
        }
      },
      warnings: []
    })
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

describe("buildWeeklyEbosReport", () => {
  test("generates a complete 10-section weekly report from empty adapter data", async () => {
    const result = await buildWeeklyEbosReport({
      targetDate: new Date(2026, 6, 2, 10, 0),
      adapters: [createEmptyAdapter()],
      includeHtml: true
    });

    expect(result.report.sections).toHaveLength(10);
    expect(result.report.sections.map((section) => section.key)).toEqual([
      "revenue",
      "traffic",
      "seo",
      "geo",
      "product",
      "content",
      "market",
      "competitor",
      "website_health",
      "next_plan"
    ]);
    expect(result.report.sections.every((section) => section.findings.length > 0)).toBe(true);
    expect(result.report.sections.every((section) => section.actionItems.length > 0)).toBe(true);
    expect(result.markdown).toContain("# ENHE Weekly Business Review");
    expect(result.html).toContain("ENHE Weekly Business Review");
    expect(result.dataSourceStatus.map((source) => source.key)).toEqual(["internal_database"]);
  });

  test("adds warnings and first-revenue action when weekly revenue is zero", async () => {
    const result = await buildWeeklyEbosReport({
      targetDate: new Date(2026, 6, 2, 10, 0),
      adapters: [createEmptyAdapter()]
    });
    const revenue = result.report.sections.find((section) => section.key === "revenue");

    expect(revenue?.score).toBeLessThan(50);
    expect(revenue?.warnings.some((warning) => warning.code === "no_revenue")).toBe(true);
    expect(result.nextWeekPlan.okrs[0]?.objective).toContain("第一批真实收入");
    expect(result.nextWeekPlan.actionItems.some((item) => item.title.includes("第一批真实收入"))).toBe(true);
  });

  test("marks missing external data sources without fabricating data", async () => {
    const result = await buildWeeklyEbosReport({
      targetDate: new Date(2026, 6, 2, 10, 0),
      adapters: [createEmptyAdapter()]
    });

    expect(result.report.warnings.some((warning) => warning.source === "google_search_console")).toBe(true);
    expect(result.report.warnings.some((warning) => warning.source === "market_research")).toBe(true);
    expect(result.report.warnings.some((warning) => warning.source === "ai_search_probe")).toBe(true);
  });

  test("uses provided website health snapshot in the website health section", async () => {
    const result = await buildWeeklyEbosReport({
      targetDate: new Date(2026, 6, 2, 10, 0),
      adapters: [createEmptyAdapter()],
      websiteHealthSnapshot: {
        generatedAt: new Date("2026-07-02T12:00:00+08:00"),
        commands: [
          createCommandHealthResult({ key: "lint", command: "npm run lint", exitCode: 0 }),
          createCommandHealthResult({ key: "typecheck", command: "npm run typecheck", exitCode: 0 }),
          createCommandHealthResult({ key: "build", command: "npm run build", exitCode: 0 }),
          createCommandHealthResult({ key: "ebos_tests", command: "npm run test -- src/lib/ebos", exitCode: 0 }),
          createCommandHealthResult({ key: "unit_tests", command: "npm test", exitCode: 0 }),
          createCommandHealthResult({ key: "playwright_smoke", command: "npm run test:e2e", exitCode: 0 }),
          createCommandHealthResult({ key: "lighthouse", command: "lighthouse", exitCode: 0 })
        ]
      }
    });
    const websiteHealth = result.report.sections.find((section) => section.key === "website_health");

    expect(websiteHealth?.score).toBe(100);
    expect(websiteHealth?.confidence).toBe("complete");
    expect(websiteHealth?.findings.some((item) => item.includes("website health snapshot"))).toBe(true);
  });

  test("adds integration readiness gaps to the report warnings and markdown", async () => {
    const result = await buildWeeklyEbosReport({
      targetDate: new Date(2026, 6, 2, 10, 0),
      adapters: [createEmptyAdapter()],
      integrationReadinessReport: checkEbosIntegrationReadiness({})
    });

    expect(result.report.warnings.some((warning) => warning.message.includes("Google Search Console"))).toBe(true);
    expect(result.markdown).toContain("Google Search Console");
  });

  test("adds evidence read warnings without blocking weekly report generation", async () => {
    const result = await buildWeeklyEbosReport({
      targetDate: new Date(2026, 6, 2, 10, 0),
      adapters: [createEmptyAdapter()],
      evidenceWarnings: [{
        code: "partial_data",
        severity: "warning",
        section: "website_health",
        message: "Health evidence missing; weekly report generated with internal data only."
      }]
    });

    expect(result.report.sections).toHaveLength(10);
    expect(result.report.warnings.some((warning) => warning.message.includes("Health evidence missing"))).toBe(true);
  });

  test("creates explicit integration setup tasks for missing GA, Cloudflare, and Whop", async () => {
    const result = await buildWeeklyEbosReport({
      targetDate: new Date(2026, 6, 2, 10, 0),
      adapters: [createEmptyAdapter()],
      integrationReadinessReport: checkEbosIntegrationReadiness({})
    });
    const taskTitles = result.nextWeekPlan.actionItems.map((item) => item.title).join("\n");

    expect(taskTitles).toContain("Google Analytics");
    expect(taskTitles).toContain("Cloudflare");
    expect(taskTitles).toContain("Whop");
  });

  test("turns failed homepage smoke evidence into a high-priority action", async () => {
    const result = await buildWeeklyEbosReport({
      targetDate: new Date(2026, 6, 2, 10, 0),
      adapters: [createEmptyAdapter()],
      websiteHealthSnapshot: {
        generatedAt: new Date("2026-07-02T12:00:00+08:00"),
        commands: [
          createCommandHealthResult({ key: "lint", command: "npm run lint", exitCode: 0 }),
          createCommandHealthResult({ key: "typecheck", command: "npm run typecheck", exitCode: 0 }),
          createCommandHealthResult({ key: "build", command: "npm run build", exitCode: 0 }),
          createSmokeCheckResult({
            key: "homepage",
            label: "Homepage",
            url: "https://example.com",
            status: "failed",
            httpStatus: 500,
            durationMs: 20
          })
        ]
      }
    });

    expect(result.nextWeekPlan.actionItems.some((item) => item.priority === "high" && item.title.includes("homepage"))).toBe(true);
  });

  test("uses revenue evidence catalog entries for the revenue section and next-week plan", async () => {
    const result = await buildWeeklyEbosReport({
      targetDate: new Date(2026, 6, 2, 10, 0),
      adapters: [createEmptyAdapter()],
      evidenceCatalogEntries: [createRevenueEvidenceCatalogEntry()]
    });
    const revenue = result.report.sections.find((section) => section.key === "revenue");

    expect(revenue?.score).toBe(42);
    expect(revenue?.confidence).toBe("partial");
    expect(revenue?.findings.some((finding) => finding.includes("revenue_evidence"))).toBe(true);
    expect(result.nextWeekPlan.okrs[0]?.objective).toContain("第一批真实收入");
    expect(result.nextWeekPlan.actionItems.some((item) => item.title.includes("首批收入验证"))).toBe(true);
  });

  test("uses market evidence catalog entries for the market section and next-week plan", async () => {
    const result = await buildWeeklyEbosReport({
      targetDate: new Date(2026, 6, 2, 10, 0),
      adapters: [createEmptyAdapter()],
      evidenceCatalogEntries: [createMarketEvidenceCatalogEntry()]
    });
    const market = result.report.sections.find((section) => section.key === "market");

    expect(market?.score).toBe(76);
    expect(market?.confidence).toBe("partial");
    expect(market?.findings.some((finding) => finding.includes("market_evidence"))).toBe(true);
    expect(result.nextWeekPlan.actionItems.some((item) => item.title.includes("AI 视频工作流包"))).toBe(true);
  });

  test("keeps deployment execution status in the weekly report result", async () => {
    const status = deploymentExecutionStatus();
    const result = await buildWeeklyEbosReport({
      targetDate: new Date(2026, 6, 3, 10, 0),
      adapters: [createEmptyAdapter()],
      deploymentExecutionStatus: status
    });

    expect(result.deploymentExecutionStatus).toMatchObject({
      deploymentStatus: "approved_not_executed",
      approvedByUser: true,
      approvedAt: "2026-07-04T15:33:18.303Z"
    });
    expect(result.nextWeekPlan.actionItems[0]?.title).toBe("Execute approved validation deployment");
  });
});

function createRevenueEvidenceCatalogEntry(): EbosEvidenceCatalogEntry {
  return {
    id: "revenue_evidence:2026-07-03:2026-07-03-revenue_evidence.json",
    filePath: "reports/ebos/evidence/revenue_evidence/2026-07-03-revenue_evidence.json",
    fileName: "2026-07-03-revenue_evidence.json",
    evidenceKind: "revenue_evidence",
    contractVersion: "ebos-evidence-v1",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-03T00:00:00.000Z",
    periodStart: "2026-06-29",
    periodEnd: "2026-07-05",
    generator: "scripts/generate-ebos-revenue-evidence.ts",
    score: 42,
    confidence: "partial",
    dataCompleteness: "partial",
    warningsCount: 1,
    errorsCount: 0,
    actionItemsCount: 1,
    validationStatus: "valid_with_warnings",
    payloadSummary: {
      summaryType: "revenue_evidence",
      overallScore: 42,
      grossRevenue: 0,
      netRevenue: 0,
      totalOrders: 0,
      paidOrders: 0,
      firstRevenueAchieved: false,
      topProductRevenueMetrics: [],
      actionItemsCount: 1,
      confidence: "partial"
    },
    warnings: [{
      code: "no_revenue",
      severity: "warning",
      message: "尚未完成第一批真实收入验证。",
      source: "internal_database"
    }],
    actionItems: [{
      id: "revenue-first-validation",
      title: "选择 1-2 个高 readiness 产品进行首批收入验证",
      description: "完成真实下单和支付验证。",
      priority: "critical",
      owner: "codex",
      relatedSection: "revenue",
      status: "open"
    }]
  };
}

function createMarketEvidenceCatalogEntry(): EbosEvidenceCatalogEntry {
  return {
    id: "market_evidence:2026-07-03:2026-07-03-market_evidence.json",
    filePath: "reports/ebos/evidence/market_evidence/2026-07-03-market_evidence.json",
    fileName: "2026-07-03-market_evidence.json",
    evidenceKind: "market_evidence",
    contractVersion: "ebos-evidence-v1",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-03T00:00:00.000Z",
    periodStart: "2026-06-29",
    periodEnd: "2026-07-05",
    generator: "scripts/generate-ebos-market-evidence.ts",
    score: 76,
    confidence: "partial",
    dataCompleteness: "partial",
    warningsCount: 1,
    errorsCount: 0,
    actionItemsCount: 1,
    validationStatus: "valid_with_warnings",
    payloadSummary: {
      summaryType: "market_evidence",
      overallScore: 76,
      signalsCount: 10,
      recommendedProductDirectionsCount: 3,
      topProductDirections: [
        {
          productDirection: "AI 视频工作流包",
          priorityScore: 82,
          recommendedAction: "validate_first"
        }
      ],
      actionItemsCount: 1,
      confidence: "partial"
    },
    warnings: [{
      code: "manual_market_seed",
      severity: "warning",
      message: "manual input 为观察种子，不代表真实搜索量。",
      source: "manual_input"
    }],
    actionItems: [{
      id: "market-ai-video-validation",
      title: "验证市场机会：AI 视频工作流包",
      description: "用产品页预售或内容测试验证 AI 视频工作流包需求。",
      priority: "high",
      owner: "codex",
      relatedSection: "market",
      status: "open"
    }]
  };
}
