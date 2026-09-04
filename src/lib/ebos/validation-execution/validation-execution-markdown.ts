import { describeValidationOutcomeRule } from "./validation-execution-scoring";
import type {
  EbosValidationExecutionInput,
  EbosValidationExecutionPlan
} from "./validation-execution-types";

export function renderValidationExecutionMarkdown(input: EbosValidationExecutionInput) {
  return [
    "# ENHE Validation Execution Input",
    "",
    `目标日期：${input.targetDate}`,
    `生成时间：${input.generatedAt}`,
    `Decision Report：${input.decisionReportPath}`,
    `Validation Tracker：${input.validationTrackerPath}`,
    `填写文件：${input.validationResultInputPath}`,
    "",
    "## 1. 本轮验证目标",
    list(input.executionPlans.map((plan) => `${plan.title}: ${plan.objective}`)),
    "",
    "## 2. 验证计划列表",
    list(input.executionPlans.map(renderPlanLine)),
    "",
    "## 3. AI Prompt Kit 执行记录",
    renderTargetSection(input.executionPlans, "AI Prompt Kit"),
    "",
    "## 4. FaceSwap Studio 执行记录",
    renderTargetSection(input.executionPlans, "FaceSwap"),
    "",
    "## 5. AI Video Studio 执行记录",
    renderTargetSection(input.executionPlans, "Video Studio"),
    "",
    "## 6. 渠道记录表",
    list(input.channelTracking.map((channel) => `${channel.channel}: ${channel.plannedAction}; fields=${channel.metricFields.map((field) => field.key).join(", ") || "none"}`)),
    "",
    "## 7. Codex 执行清单",
    list(input.executionPlans.flatMap((plan) => plan.codexTasks.map((task) => `${plan.title}: ${task}`))),
    "",
    "## 8. 人工执行清单",
    list(input.executionPlans.flatMap((plan) => plan.humanTasks.map((task) => `${plan.title}: ${task}`))),
    "",
    "## 9. 成功 / 失败判断规则",
    list(input.executionPlans.map((plan) => `${plan.title}: ${describeValidationOutcomeRule(plan.validationMethod)}`)),
    "",
    "## 10. 如何填写验证结果",
    list([
      "打开 validation-input.json，只填写真实观察到的结果。",
      "不要伪造 CTA、线索、订单、收入、退款或用户反馈。",
      "未知数字保持 0，未知文本保持空字符串，未知数组保持 []。",
      "必须保留 planId，不要改名。",
      ...input.executionPlans.flatMap((plan) => plan.trackingFields.map((field) => `${plan.title}: ${field.key} - ${field.description}`))
    ]),
    "",
    "## 11. 下一次复盘使用方式",
    list([
      "运行 generate-ebos-validation-report.ts 读取 validation-input.json。",
      "Weekly / Monthly / Decision 会根据 success、partial_success、failed、not_started 调整下一轮优先级。",
      ...input.weeklyReviewQuestions
    ]),
    "",
    "## Warnings",
    list(input.warnings.map((warning) => `${warning.code}: ${warning.message}`))
  ].join("\n");
}

function renderPlanLine(plan: EbosValidationExecutionPlan) {
  return `${plan.title}: method=${plan.validationMethod}, status=${plan.executionStatus}, threshold=${plan.minimumSuccessThreshold}`;
}

function renderTargetSection(plans: EbosValidationExecutionPlan[], keyword: string) {
  const matched = plans.filter((plan) => {
    const text = `${plan.title} ${plan.targetDirection} ${plan.targetProduct ?? ""}`.toLowerCase();
    return text.includes(keyword.toLowerCase());
  });
  return list(matched.flatMap((plan) => [
    `${plan.title}`,
    `需要填写字段：${plan.trackingFields.map((field) => field.key).join(", ")}`,
    `验收标准：${plan.acceptanceCriteria.join("; ")}`
  ]));
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
