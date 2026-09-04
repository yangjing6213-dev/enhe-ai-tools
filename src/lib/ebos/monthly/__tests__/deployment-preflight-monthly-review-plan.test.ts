import { describe, expect, test } from "vitest";
import { generateMonthlyReviewPlan } from "../monthly-review-plan";
import type { EbosProductionDeploymentPreflightReport } from "../../deployment";

function preflight(overrides: Partial<EbosProductionDeploymentPreflightReport> = {}): EbosProductionDeploymentPreflightReport {
  return {
    reportType: "production_deployment_preflight",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-04T00:00:00.000Z",
    siteUrl: "https://www.enhe-tech.com.cn",
    validationRoutes: ["/validation/ai-prompt-kit", "/en/validation/ai-prompt-kit"],
    configSummary: {
      packageManagerDetected: "npm",
      scriptsDetected: { lint: true, typecheck: true, build: true, start: true, test: true, "prisma:generate": true },
      nextConfigDetected: true,
      dockerfileDetected: true,
      dockerComposeDetected: true,
      nginxConfigDetected: false,
      deployDocsDetected: true,
      standaloneOutputDetected: true,
      warnings: []
    },
    buildChecks: [],
    routeChecks: [],
    environmentChecks: [],
    dockerChecks: [],
    nginxChecks: [],
    deploymentPlan: { localCommands: [], serverCommands: [], dockerCommands: [], verificationCommands: [], notes: [], warnings: [] },
    rollbackPlan: { rollbackStrategy: "Scoped rollback", filesToRevert: [], commands: [], dataSafetyNotes: [], warnings: [] },
    postDeploySmokeTests: [],
    readinessScore: 92,
    readinessStatus: "ready_to_deploy",
    blockers: [],
    warnings: [],
    nextActions: [],
    ...overrides
  };
}

describe("monthly plan deployment preflight integration", () => {
  test("references ready production deployment preflight", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      productionDeploymentPreflightReport: preflight()
    });

    expect(plan.codexTasks[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("Execute production deployment"),
      reason: expect.stringContaining("readinessStatus=ready_to_deploy")
    }));
  });

  test("prioritizes blocked production deployment preflight", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      productionDeploymentPreflightReport: preflight({
        readinessStatus: "blocked",
        blockers: ["Missing build evidence"]
      })
    });

    expect(plan.codexTasks[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("Fix production deployment blockers"),
      reason: expect.stringContaining("Missing build evidence")
    }));
  });
});
