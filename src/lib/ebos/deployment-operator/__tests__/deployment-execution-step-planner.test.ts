import { describe, expect, test } from "vitest";
import { buildDeploymentExecutionSteps } from "../deployment-execution-step-planner";

describe("deployment execution step planner", () => {
  test("outputs 6 to 8 auditable execution steps", () => {
    const steps = buildDeploymentExecutionSteps({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      manualRequiredCommandsCount: 3,
      safeToProceed: true
    });

    expect(steps.length).toBeGreaterThanOrEqual(6);
    expect(steps.length).toBeLessThanOrEqual(8);
  });

  test("includes expected outcome and failure handling on every step", () => {
    const steps = buildDeploymentExecutionSteps({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      manualRequiredCommandsCount: 3,
      safeToProceed: true
    });

    expect(steps.every((step) => step.expectedOutcome && step.failureHandling)).toBe(true);
    expect(steps.some((step) => step.actor === "codex_local" && step.command?.includes("npm run build"))).toBe(true);
    expect(steps.some((step) => step.actor === "user_server")).toBe(true);
  });

  test("does not claim deployment is already complete", () => {
    const steps = buildDeploymentExecutionSteps({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      manualRequiredCommandsCount: 3,
      safeToProceed: true
    });

    expect(JSON.stringify(steps)).not.toContain("已经部署");
    expect(JSON.stringify(steps)).not.toContain("已部署");
  });
});
