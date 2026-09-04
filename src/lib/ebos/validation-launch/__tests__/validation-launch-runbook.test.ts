import { describe, expect, test } from "vitest";
import { buildValidationLaunchRunbook } from "../validation-launch-runbook";
import type { EbosValidationLaunchReadinessReport } from "../validation-launch-types";

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
    readinessScore: 90,
    readinessStatus: "ready",
    blockers: [],
    warnings: [],
    nextActions: [],
    ...overrides
  };
}

describe("validation launch runbook", () => {
  test("builds a runbook from readiness report", () => {
    const runbook = buildValidationLaunchRunbook({
      targetDate: "2026-07-03",
      readinessReport: readiness(),
      readinessReportPath: "reports/ebos/validation/launch/readiness.json"
    });

    expect(runbook.runbookType).toBe("validation_launch_operator_runbook");
    expect(runbook.readinessReportPath).toContain("readiness.json");
    expect(runbook.codexSteps.length).toBeGreaterThan(0);
  });

  test("includes rollback notes and anti-fabrication warnings", () => {
    const runbook = buildValidationLaunchRunbook({
      targetDate: "2026-07-03",
      readinessReport: readiness()
    });
    const text = [
      ...runbook.rollbackNotes,
      ...runbook.warnings
    ].join("\n");

    expect(text).toContain("不能伪造");
    expect(text).toContain("不能登录");
    expect(text).toContain("真实用户");
    expect(runbook.rollbackNotes.length).toBeGreaterThan(0);
  });
});
