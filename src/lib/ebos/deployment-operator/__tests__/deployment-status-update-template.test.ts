import { describe, expect, test } from "vitest";
import { buildDeploymentStatusUpdateTemplate } from "../deployment-status-update-template";

describe("deployment status update template", () => {
  test("does not allow approved_not_executed to jump directly to verified", () => {
    const template = buildDeploymentStatusUpdateTemplate({
      targetDate: "2026-07-03",
      currentStatus: "approved_not_executed"
    });

    expect(template.allowedNextStatuses).toEqual(["executing", "deployed_pending_verification", "failed", "rolled_back"]);
    expect(template.forbiddenStatuses).toContain("verified");
    expect(template.statusUpdateRules.join("\n")).toContain("不能跳过 post-launch check");
  });

  test("allows verified only after post-launch check passes", () => {
    const template = buildDeploymentStatusUpdateTemplate({
      targetDate: "2026-07-03",
      currentStatus: "approved_not_executed"
    });

    expect(template.templateAfterPostLaunchCheck.deploymentStatus).toBe("verified");
    expect(template.templateAfterPostLaunchCheck.postLaunchCheckStatus).toBe("passed");
  });

  test("moves server command completion only to deployed_pending_verification", () => {
    const template = buildDeploymentStatusUpdateTemplate({
      targetDate: "2026-07-03",
      currentStatus: "approved_not_executed"
    });

    expect(template.templateAfterServerCommands.deploymentStatus).toBe("deployed_pending_verification");
    expect(template.templateAfterServerCommands.postLaunchCheckStatus).toBe("not_run");
  });
});
