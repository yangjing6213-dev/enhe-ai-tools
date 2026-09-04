import { describe, expect, test } from "vitest";
import { buildDeploymentRollbackPlan } from "../deployment-rollback-planner";

describe("deployment rollback planner", () => {
  test("includes validation route files and tracking rollback note", () => {
    const plan = buildDeploymentRollbackPlan({ targetDate: "2026-07-03" });
    const text = JSON.stringify(plan);

    expect(text).toContain("src/app/(zh-public)/validation/ai-prompt-kit/page.tsx");
    expect(text).toContain("src/app/en/validation/ai-prompt-kit/page.tsx");
    expect(text).toContain("tracking event whitelist");
  });

  test("keeps reports and does not include dangerous delete operations", () => {
    const plan = buildDeploymentRollbackPlan({ targetDate: "2026-07-03" });
    const text = JSON.stringify(plan);

    expect(text).toContain("Keep reports/ebos");
    expect(text).not.toContain("rm -rf reports");
    expect(text).not.toContain("Remove-Item reports");
    expect(text).not.toContain("git reset --hard");
  });
});
