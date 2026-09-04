import { describe, expect, test } from "vitest";
import { renderValidationExecutionMarkdown } from "../validation-execution-markdown";
import type { EbosValidationExecutionInput } from "../validation-execution-types";

function executionInput(): EbosValidationExecutionInput {
  return {
    inputType: "validation_execution_input",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-03T08:00:00.000Z",
    decisionReportPath: "reports/ebos/decision/2026-07-03-decision-report.json",
    validationTrackerPath: "reports/ebos/validation/templates/2026-07-03-validation-tracker.json",
    validationResultInputPath: "reports/ebos/validation/inputs/2026-07-03-validation-input.json",
    executionPlans: [{
      planId: "validation-direction-3-ai-prompt-kit",
      title: "Validate AI Prompt Kit",
      targetDirection: "AI Prompt Kit",
      validationMethod: "landing_page",
      objective: "Validate demand.",
      hypothesis: "Users will click or buy.",
      successMetric: "CTA clicks, leads, or orders.",
      minimumSuccessThreshold: "CTA clicks >= 10 or leads >= 3.",
      durationDays: 7,
      executionStatus: "not_started",
      trackingFields: [{
        key: "ctaClicks",
        label: "CTA clicks",
        type: "number",
        required: true,
        description: "Observed CTA clicks.",
        example: 0
      }],
      codexTasks: ["Draft validation page"],
      humanTasks: ["Record CTA clicks"],
      acceptanceCriteria: ["CTA tracking note exists."],
      resultInputTemplate: { planId: "validation-direction-3-ai-prompt-kit", status: "not_started", ctaClicks: 0 }
    }],
    channelTracking: [],
    resultRecordingRules: ["Do not fabricate results."],
    weeklyReviewQuestions: ["What changed this week?"],
    warnings: []
  };
}

describe("validation execution markdown", () => {
  test("renders the required 11 headings", () => {
    const markdown = renderValidationExecutionMarkdown(executionInput());

    for (const heading of [
      "# ENHE Validation Execution Input",
      "## 1. 本轮验证目标",
      "## 2. 验证计划列表",
      "## 3. AI Prompt Kit 执行记录",
      "## 4. FaceSwap Studio 执行记录",
      "## 5. AI Video Studio 执行记录",
      "## 6. 渠道记录表",
      "## 7. Codex 执行清单",
      "## 8. 人工执行清单",
      "## 9. 成功 / 失败判断规则",
      "## 10. 如何填写验证结果",
      "## 11. 下一次复盘使用方式"
    ]) {
      expect(markdown).toContain(heading);
    }
  });

  test("states that results must not be fabricated and explains fields", () => {
    const markdown = renderValidationExecutionMarkdown(executionInput());

    expect(markdown).toContain("不要伪造");
    expect(markdown).toContain("ctaClicks");
    expect(markdown).toContain("Record CTA clicks");
  });
});
