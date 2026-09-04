import {
  buildCodexLaunchSteps,
  buildDataIntakeSteps,
  buildExternalChannelSteps,
  buildPostLaunchCommands,
  buildUserMinimumActions
} from "./validation-launch-checklist";
import type {
  EbosValidationLaunchReadinessReport,
  EbosValidationLaunchRunbook
} from "./validation-launch-types";

export function buildValidationLaunchRunbook(options: {
  targetDate: string | Date;
  readinessReport?: EbosValidationLaunchReadinessReport;
  readinessReportPath?: string;
}): EbosValidationLaunchRunbook {
  const targetDate = toDateKey(options.targetDate);
  const warnings = [
    "Codex 不能伪造外部平台数据。",
    "Codex 不能登录闲鱼、淘宝、Whop、小红书、微信或其他外部平台。",
    "真实订单、咨询、退款、点击和用户反馈必须来自真实用户行为。",
    ...(options.readinessReport?.warnings ?? [])
  ];

  return {
    runbookType: "validation_launch_operator_runbook",
    targetDate,
    generatedAt: new Date().toISOString(),
    launchObjective: "发布并验证 AI Prompt Kit 最小可交付产品的真实需求，形成可复盘的外部渠道和站内证据。",
    validationTargets: [
      "/validation/ai-prompt-kit",
      "/en/validation/ai-prompt-kit",
      "AI Prompt Kit external marketplace and social posts"
    ],
    ...(options.readinessReportPath ? { readinessReportPath: options.readinessReportPath } : {}),
    ...(options.readinessReport ? { readinessReport: options.readinessReport } : {}),
    codexSteps: buildCodexLaunchSteps(targetDate),
    userMinimumActions: buildUserMinimumActions(),
    externalChannelSteps: buildExternalChannelSteps(),
    dataIntakeSteps: buildDataIntakeSteps(targetDate),
    postLaunchCommands: buildPostLaunchCommands(targetDate),
    rollbackNotes: [
      "如果 validation page 编译、路由、CTA tracking 或合规文案失败，先暂缓发布并修复 readiness blockers。",
      "如果外部平台文案被平台拒绝，保留拒绝原因，不要绕过平台规则。",
      "如果没有真实用户行为，validation input 保持 0、空字符串或空数组，不要补猜。",
      "如果导入 external intake 后发现异常值，恢复 validation input backup，并重新执行 dry-run。"
    ],
    warnings
  };
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
