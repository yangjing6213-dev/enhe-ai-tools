import { describe, expect, test } from "vitest";
import { createEmptyEbosReport } from "../../report-schema";
import { generateNextWeekPlan } from "../weekly-report-plan";
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

describe("weekly plan deployment preflight integration", () => {
  test("suggests production deployment when preflight is ready_to_deploy", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, undefined, undefined, undefined, undefined, undefined, preflight());

    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("Execute production deployment"),
      description: expect.stringContaining("readinessStatus=ready_to_deploy")
    }));
  });

  test("prioritizes deployment blockers", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, undefined, undefined, undefined, undefined, undefined, preflight({
      readinessStatus: "blocked",
      blockers: ["Missing /validation/ai-prompt-kit"]
    }));

    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("Fix production deployment blockers"),
      description: expect.stringContaining("/validation/ai-prompt-kit")
    }));
  });
});
