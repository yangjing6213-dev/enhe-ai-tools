import { describe, expect, test } from "vitest";
import { buildDeploymentCommandPlan } from "../deployment-command-planner";

describe("deployment command planner", () => {
  test("includes local quality and EBOS launch commands", () => {
    const plan = buildDeploymentCommandPlan({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      hasDeployConfig: true
    });
    const text = plan.localCommands.map((item) => item.command ?? item.title).join("\n");

    expect(text).toContain("npm run lint");
    expect(text).toContain("npm run typecheck");
    expect(text).toContain("npm run build");
    expect(text).toContain("check-ebos-validation-launch-readiness");
    expect(text).toContain("generate-ebos-validation-launch-execution");
  });

  test("includes post-launch verification command", () => {
    const plan = buildDeploymentCommandPlan({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      hasDeployConfig: true
    });
    const text = plan.verificationCommands.map((item) => item.command ?? item.title).join("\n");

    expect(text).toContain("check-ebos-validation-post-launch");
    expect(text).toContain("https://www.enhe-tech.com.cn");
  });

  test("marks server commands manual_required when server path cannot be inferred", () => {
    const plan = buildDeploymentCommandPlan({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      hasDeployConfig: false
    });

    expect(plan.serverCommands.some((item) => item.status === "manual_required")).toBe(true);
  });

  test("does not generate dangerous commands", () => {
    const plan = buildDeploymentCommandPlan({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      hasDeployConfig: true
    });
    const text = JSON.stringify(plan);

    expect(text).not.toContain("git reset --hard");
    expect(text).not.toContain("docker system prune");
    expect(text).not.toContain("docker stop $(docker ps -q)");
  });
});
