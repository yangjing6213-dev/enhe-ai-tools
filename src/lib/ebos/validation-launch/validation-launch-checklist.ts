import type {
  EbosValidationExternalChannelStep,
  EbosValidationLaunchChecklist,
  EbosValidationLaunchStep
} from "./validation-launch-types";

export function buildValidationLaunchChecklist(options: {
  targetDate: string | Date;
}): EbosValidationLaunchChecklist {
  const targetDate = toDateKey(options.targetDate);

  return {
    targetDate,
    codexSteps: buildCodexLaunchSteps(targetDate),
    userMinimumActions: buildUserMinimumActions(),
    externalChannelSteps: buildExternalChannelSteps(),
    dataIntakeSteps: buildDataIntakeSteps(targetDate),
    postLaunchCommands: buildPostLaunchCommands(targetDate)
  };
}

export function buildCodexLaunchSteps(targetDate: string | Date = "YYYY-MM-DD"): EbosValidationLaunchStep[] {
  const dateKey = toDateKey(targetDate);

  return [
    step("codex-build", "Run build check", "确认 Next.js build 可以通过，避免验证页上线前存在编译错误。", "npm run build", "Build exits with code 0."),
    step("codex-lint", "Run lint check", "确认 lint 没有阻断级问题。", "npm run lint", "Lint exits with code 0."),
    step("codex-typecheck", "Run typecheck check", "确认 TypeScript 类型检查通过。", "npm run typecheck", "Typecheck exits with code 0."),
    step("codex-validation-page", "Check validation page files", "检查 validation page 路由和共享组件是否存在，并包含 Hero、Summary、CTA、FAQ、合规提示和 metadata。", `npx tsx scripts/check-ebos-validation-launch-readiness.ts --date ${dateKey}`, "Readiness report lists both validation pages."),
    step("codex-cta-tracking", "Check CTA tracking", "检查 CTA tracking 事件是否在页面和 analytics 白名单里同时存在。", `npx tsx scripts/check-ebos-validation-launch-readiness.ts --date ${dateKey}`, "Readiness trackingChecks are found=true."),
    step("codex-validation-input", "Check validation-input status", "确认 validation-input 文件存在，且不会把未知外部数据当成真实结果。", `npx tsx scripts/check-ebos-validation-input.ts --date ${dateKey}`, "Validation input check completes without fabricated metrics."),
    step("codex-external-intake", "Check external intake template", "确认 external intake 模板、可编辑 input 和导入报告路径已经准备好。", `npx tsx scripts/generate-ebos-external-intake-template.ts --date ${dateKey}`, "External intake template and input paths exist.")
  ];
}

export function buildUserMinimumActions(): string[] {
  return [
    "确认发布验证页，或明确说明暂缓发布的原因。",
    "把平台文案复制到外部平台，不需要手动改代码。",
    "真实发生咨询、订单、退款或用户反馈后，把数据复制给 Codex，不能补猜。"
  ];
}

export function buildExternalChannelSteps(): EbosValidationExternalChannelStep[] {
  return [
    externalStep("xianyu", "闲鱼发布", "使用 AI Prompt Kit 标题、卖点、价格测试和 FAQ 文案发布或准备草稿。"),
    externalStep("taobao", "淘宝发布", "整理商品标题、详情页、交付说明、售后边界和价格测试信息。"),
    externalStep("whop", "Whop listing", "整理英文 listing、benefits、delivery、FAQ、support 和 pricing 文案。"),
    externalStep("xiaohongshu", "小红书笔记", "使用合规种草文案说明场景、交付物和咨询入口。"),
    externalStep("wechat", "微信私域", "整理朋友圈、私聊、社群发布文本和用户咨询记录口径。")
  ];
}

export function buildDataIntakeSteps(targetDate: string | Date = "YYYY-MM-DD"): EbosValidationLaunchStep[] {
  const dateKey = toDateKey(targetDate);

  return [
    step("intake-template", "生成 external intake template", "生成外部渠道填报模板和可编辑 input。", `npx tsx scripts/generate-ebos-external-intake-template.ts --date ${dateKey}`, "Template Markdown/JSON and editable input are generated."),
    step("intake-real-data", "等待用户提供真实数据", "只接收真实发生的浏览、点击、咨询、订单、收入、退款、反馈。", undefined, "No fabricated external platform metrics are added."),
    step("intake-dry-run", "dry-run import", "先执行 dry-run，检查将要回填的字段和异常值。", `npx tsx scripts/import-ebos-external-intake.ts --date ${dateKey}`, "Dry-run import report is generated."),
    step("intake-anomaly-review", "检查异常值", "检查异常高点击、订单、收入、退款和空字段，不确定时保留 warning。", undefined, "Anomalies are either confirmed by user-provided data or skipped."),
    step("intake-apply", "--apply", "只有 dry-run 没有异常后才写回 validation input。", `npx tsx scripts/import-ebos-external-intake.ts --date ${dateKey} --apply`, "Validation input backup and import report are generated."),
    step("intake-regenerate", "重新生成 validation / decision / weekly / monthly", "导入后重新生成下游 EBOS 报告。", buildPostLaunchCommands(dateKey).join(" && "), "Validation, decision, weekly, and monthly reports are regenerated.")
  ];
}

export function buildPostLaunchCommands(targetDate: string | Date = "YYYY-MM-DD"): string[] {
  const dateKey = toDateKey(targetDate);

  return [
    `npx tsx scripts/generate-ebos-validation-report.ts --date ${dateKey}`,
    `npx tsx scripts/generate-ebos-decision-report.ts --date ${dateKey}`,
    `npx tsx scripts/generate-ebos-weekly-report.ts --date ${dateKey}`,
    `npx tsx scripts/generate-ebos-monthly-review.ts --date ${dateKey}`
  ];
}

function step(
  id: string,
  title: string,
  description: string,
  command: string | undefined,
  verification: string
): EbosValidationLaunchStep {
  return {
    id,
    title,
    description,
    owner: "codex",
    ...(command ? { command } : {}),
    verification
  };
}

function externalStep(
  channel: EbosValidationExternalChannelStep["channel"],
  title: string,
  description: string
): EbosValidationExternalChannelStep {
  return {
    channel,
    title,
    description,
    assetHint: "docs/ebos/validation-assets 中已有可复制素材；发布前按平台规则人工确认。",
    forbiddenActions: [
      "Codex 不能登录外部平台。",
      "Codex 不能伪造浏览、点击、咨询、订单、收入或用户反馈。",
      "Codex 不能绕过平台规则。"
    ]
  };
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
