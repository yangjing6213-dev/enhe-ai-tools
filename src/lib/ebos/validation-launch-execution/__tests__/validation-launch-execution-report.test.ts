import { describe, expect, test } from "vitest";
import { buildValidationLaunchExecutionReport } from "../validation-launch-execution-report";
import type {
  EbosValidationLaunchReadinessReport,
  EbosValidationLaunchRunbook
} from "../../validation-launch";

function readiness(overrides: Partial<EbosValidationLaunchReadinessReport> = {}): EbosValidationLaunchReadinessReport {
  return {
    reportType: "validation_launch_readiness",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-04T00:00:00.000Z",
    validationPages: [],
    assetFiles: [],
    trackingChecks: [],
    seoGeoChecks: [],
    externalIntakeChecks: [],
    deploymentChecks: [],
    readinessScore: 98,
    readinessStatus: "ready_with_warnings",
    blockers: [],
    warnings: ["External intake input exists but is not filled with real channel data."],
    nextActions: [],
    ...overrides
  };
}

function runbook(): EbosValidationLaunchRunbook {
  return {
    runbookType: "validation_launch_operator_runbook",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-04T00:00:00.000Z",
    launchObjective: "Launch AI Prompt Kit validation.",
    validationTargets: ["/validation/ai-prompt-kit"],
    readinessReportPath: "readiness.json",
    codexSteps: [],
    userMinimumActions: ["Confirm publishing"],
    externalChannelSteps: [],
    dataIntakeSteps: [],
    postLaunchCommands: [],
    rollbackNotes: [],
    warnings: []
  };
}

describe("validation launch execution report", () => {
  test("marks ready_with_warnings readiness as ready_to_deploy", async () => {
    const report = await buildValidationLaunchExecutionReport({
      targetDate: "2026-07-03",
      readinessReport: readiness(),
      readinessReportPath: "reports/ebos/validation/launch/readiness.json",
      runbook: runbook(),
      runbookPath: "reports/ebos/validation/launch/runbook.json"
    });

    expect(report.reportType).toBe("validation_launch_execution");
    expect(report.launchStatus).toBe("ready_to_deploy");
    expect(report.readinessReportPath).toContain("readiness.json");
    expect(report.runbookPath).toContain("runbook.json");
  });

  test("marks blockers as blocked", async () => {
    const report = await buildValidationLaunchExecutionReport({
      targetDate: "2026-07-03",
      readinessReport: readiness({
        readinessStatus: "blocked",
        blockers: ["Missing validation page"]
      }),
      runbook: runbook()
    });

    expect(report.launchStatus).toBe("blocked");
    expect(report.blockers).toContain("Missing validation page");
  });

  test("does not fabricate deployed status without explicit confirmation", async () => {
    const report = await buildValidationLaunchExecutionReport({
      targetDate: "2026-07-03",
      readinessReport: readiness({ readinessStatus: "ready" }),
      runbook: runbook()
    });

    expect(report.launchStatus).not.toBe("deployed_pending_verification");
  });

  test("data intake workflow includes dry-run, apply, and downstream reports", async () => {
    const report = await buildValidationLaunchExecutionReport({
      targetDate: "2026-07-03",
      readinessReport: readiness(),
      runbook: runbook()
    });
    const text = report.dataIntakeWorkflow.map((step) => `${step.title} ${step.command ?? ""}`).join("\n");

    expect(text).toContain("dry-run");
    expect(text).toContain("--apply");
    expect(text).toContain("generate-ebos-validation-report");
    expect(text).toContain("generate-ebos-decision-report");
    expect(text).toContain("generate-ebos-weekly-report");
    expect(text).toContain("generate-ebos-monthly-review");
  });
});
