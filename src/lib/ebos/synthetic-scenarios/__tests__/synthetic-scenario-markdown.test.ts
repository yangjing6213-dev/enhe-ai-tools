import { describe, expect, test } from "vitest";
import { buildSyntheticFailureScenario } from "../synthetic-failure-scenario-builder";
import { analyzeSyntheticFailureScenario } from "../synthetic-failure-analyzer";
import { buildSyntheticOptimizationPlan } from "../synthetic-optimization-planner";
import { renderSyntheticFailureScenarioMarkdown } from "../synthetic-scenario-markdown";

describe("renderSyntheticFailureScenarioMarkdown", () => {
  test("contains the required 11 report headings and synthetic guardrails", () => {
    const scenario = buildSyntheticFailureScenario({ targetDate: "2026-07-03" });
    const analysis = analyzeSyntheticFailureScenario(scenario);
    const plan = buildSyntheticOptimizationPlan(analysis);
    const markdown = renderSyntheticFailureScenarioMarkdown(scenario, analysis, plan);

    for (const heading of [
      "## 1. 模拟目的",
      "## 2. 重要声明：这是模拟数据",
      "## 3. 最坏情况假设",
      "## 4. 模拟渠道数据",
      "## 5. 漏斗诊断",
      "## 6. 可能失败原因",
      "## 7. 页面问题",
      "## 8. 产品/报价问题",
      "## 9. 渠道问题",
      "## 10. 优先优化建议",
      "## 11. 下一轮真实验证计划"
    ]) {
      expect(markdown).toContain(heading);
    }
    expect(markdown).toContain("synthetic: true");
    expect(markdown).toContain("不能作为真实数据回填");
  });
});

