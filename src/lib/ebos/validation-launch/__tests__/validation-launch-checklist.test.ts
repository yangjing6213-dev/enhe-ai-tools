import { describe, expect, test } from "vitest";
import {
  buildCodexLaunchSteps,
  buildDataIntakeSteps,
  buildExternalChannelSteps,
  buildPostLaunchCommands,
  buildUserMinimumActions,
  buildValidationLaunchChecklist
} from "../validation-launch-checklist";

describe("validation launch checklist", () => {
  test("builds non-empty Codex steps with required checks", () => {
    const steps = buildCodexLaunchSteps("2026-07-03");
    const text = steps.map((step) => `${step.title} ${step.command ?? ""}`).join("\n");

    expect(steps.length).toBeGreaterThan(0);
    expect(text).toContain("npm run build");
    expect(text).toContain("npm run lint");
    expect(text).toContain("npm run typecheck");
    expect(text).toContain("validation page");
    expect(text).toContain("CTA tracking");
    expect(text).toContain("validation-input");
    expect(text).toContain("external intake");
  });

  test("keeps user minimum actions short", () => {
    const actions = buildUserMinimumActions();

    expect(actions).toHaveLength(3);
    expect(actions.join("\n")).toContain("确认发布验证页");
    expect(actions.join("\n")).toContain("复制到外部平台");
    expect(actions.join("\n")).toContain("真实发生");
  });

  test("external channel steps cover required platforms", () => {
    const steps = buildExternalChannelSteps();
    const channels = steps.map((step) => step.channel);

    expect(channels).toEqual(expect.arrayContaining(["xianyu", "taobao", "whop", "xiaohongshu", "wechat"]));
  });

  test("post-launch commands regenerate downstream reports", () => {
    const commands = buildPostLaunchCommands("2026-07-03").join("\n");

    expect(commands).toContain("generate-ebos-validation-report");
    expect(commands).toContain("generate-ebos-decision-report");
    expect(commands).toContain("generate-ebos-weekly-report");
    expect(commands).toContain("generate-ebos-monthly-review");
  });

  test("builds a complete checklist for a target date", () => {
    const checklist = buildValidationLaunchChecklist({ targetDate: "2026-07-03" });

    expect(checklist.targetDate).toBe("2026-07-03");
    expect(checklist.codexSteps.length).toBeGreaterThan(0);
    expect(checklist.userMinimumActions).toHaveLength(3);
    expect(checklist.dataIntakeSteps.map((step) => step.title).join("\n")).toContain("dry-run");
  });
});
